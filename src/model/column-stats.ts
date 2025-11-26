import {RelationData} from "@/model/relation";
import {RelationStats, ColumnStatsHistogram, ColumnStatsType, RelationState} from "@/model/relation-state";
import {Column} from "@/model/data-source-connection";
import {ConnectionsService} from "@/state/connections/connections-service";
import {ValueType} from "@/model/value-type";
import {HistDataType} from "@/components/relation/table/stats/HistogramChart";

// export type ValueType =
//     'Integer'
//     | 'Float'
//     | 'String'
//     | 'Boolean'
//     | 'Timestamp'
//     | 'Struct'
//     | 'List'
//     | 'Map'
//     | 'Unknown';


type SimpleAggregates = 'COUNT' | 'MIN' | 'MAX';
type ExtendedAggregates = SimpleAggregates | 'HISTOGRAM';
const DEFAULT_AGGS: SimpleAggregates[] = ['COUNT', 'MIN', 'MAX'];

interface QueryColumnPart {
    select: string; // cast to appropriate type, e.g. datetime to epoch_ms(Datetime) to make sure all aggs work
    baseStats: string; // COUNT(*), MIN(col), MAX(col), AVG(col), etc.
    hist?: string; // histogram(col, bins)
    availableAggs: ExtendedAggregates[];
}


function getAggFunctions(column: Column, aggs: SimpleAggregates[], column_index: number): string[] {
    const column_ref = getColumnReference(column.name, column_index);
    return aggs.map(agg => {
        return `${agg}(${column_ref}) AS ${getColumnAggName(column, agg, column_index)}`;
    })
}

function getHistogramFunction(column: Column, column_index: number): string  {
    const column_min = getColumnAggName(column, 'MIN', column_index);
    const column_max = getColumnAggName(column, 'MAX', column_index);
    const column_hist = getColumnAggName(column, 'HISTOGRAM', column_index);
    const column_quote = getColumnReference(column.name, column_index);
    return `
        histogram(
            ${column_quote}, 
            (SELECT equi_width_bins(${column_min}, ${column_max}, 21, false) FROM bounds)
        ) AS ${column_hist}
    `;
}

function GetQueryForColumn(column: Column, index: number): QueryColumnPart {
    const column_reference = getColumnReference(column.name, index);
    const column_quote = `#${index + 1}`;
    switch (column.type) {
        case "Integer":
        case "Float":
            return {
                baseStats: getAggFunctions(column, DEFAULT_AGGS, index).join(', '),
                hist: getHistogramFunction(column, index),
                select: `${column_quote} AS ${column_reference}`,
                availableAggs: [...DEFAULT_AGGS, 'HISTOGRAM'],
            }
        case "Timestamp":
            return {
                baseStats: getAggFunctions(column, DEFAULT_AGGS, index).join(', '),
                hist: getHistogramFunction(column, index),
                select: `epoch_ms(${column_quote}) AS ${column_reference}`,
                availableAggs: [...DEFAULT_AGGS, 'HISTOGRAM'],
            }
        default:
            return {
                baseStats: getAggFunctions(column, ['COUNT'], index).join(', '),
                select: `${column_quote} AS ${column_reference}`,
                availableAggs: ['COUNT'],
            }
    }
}

interface StatsQueryResult {
    query: string;
    parts: QueryColumnPart[];
}

function buildStatsQuery(row_count: number, relation: RelationState, data: RelationData): StatsQueryResult {
    const columns = data.columns;
    const MAX_ROWS = 200_000;
    const percentage = Math.min(1, MAX_ROWS / row_count) * 100;
    const parts = columns.map(GetQueryForColumn);
    const transforms = parts.map(part => part.select).join(', ');
    const base_stats = parts.map(part => part.baseStats).join(', ');
    const hists = parts.map(part => part.hist)
        .filter(part => part !== undefined)
        .join(', ');

    const finalQuery = relation.query.finalQuery;
    const query = `
        WITH data AS (${finalQuery}),
             transformed_data AS (SELECT ${transforms}
                                  FROM (FROM data USING SAMPLE ${percentage.toFixed(2)}% (system, 42))),
             bounds AS MATERIALIZED (SELECT ${base_stats}
                                     FROM transformed_data),
             histogram_data AS (SELECT ${hists}
                                FROM transformed_data)
        SELECT *
        FROM histogram_data,
             bounds;`
    return {
        query: query,
        parts: parts,
    }
}

export function GetStatsTypeForValueType(value: ValueType): ColumnStatsType {
    switch (value) {
        case 'Integer':
        case 'Float':
        case 'Timestamp':
            return 'histogram';
        default:
            return 'non_null';
    }
}

export function getColumnAggName(column: Column, agg: ExtendedAggregates, column_index: number,  quoteName = true): string {
    const name = getColumnReference(column.name, column_index) + '_' + agg.toLowerCase();
    if (quoteName) {
        return quote(name);
    }
    return name;
}

export function quote(name: string): string {
    return `"${name.replace(/"/g, '""')}"`;
}

export function getColumnReference(name: string, index: number): string {
    return 'column_' + index;
}

export function GetAgg(agg: ExtendedAggregates, column: Column, column_index: number, data: RelationData): any {
    const aggName = getColumnAggName(column, agg, column_index, false);
    const colIndex = data.columns.findIndex(col => col.name === aggName);
    if (colIndex === -1) {
        throw new Error(`Column ${aggName} not found in relation data: Available columns: ${data.columns.map(c => c.name).join(', ')}`);
    }
    return data.rows[0][colIndex];
}

export async function GetColumnStats(relation: RelationState, data: RelationData) {

    const row_count = relation.lastExecutionMetaData?.lastResultCount;

    if (row_count === undefined) {
        console.error(`Cannot compute column stats for relation  with zero rows.`);
        return;
    }

    const buildResult = buildStatsQuery(row_count, relation, data);
    const statsData = await ConnectionsService.getInstance().executeQuery(buildResult.query);

    let stats: RelationStats = {
        columns: [],
        state: 'ready',
    }


    for (let colIndex = 0; colIndex < data.columns.length; colIndex++) {
        const column = data.columns[colIndex];
        const part = buildResult.parts[colIndex];
        const statsType = GetStatsTypeForValueType(column.type);

        switch (statsType) {
            case 'histogram': {
                const count = GetAgg('COUNT', column, colIndex, statsData );
                const min = GetAgg('MIN', column, colIndex, statsData);
                const max = GetAgg('MAX', column, colIndex, statsData);
                const histogram = GetAgg('HISTOGRAM', column, colIndex, statsData);

                let type: HistDataType = 'value';
                if (column.type === 'Timestamp') {
                    type = 'timestamp';
                }

                stats.columns.push({
                    type: 'histogram',
                    nonNullCount: count,
                    min: min,
                    max: max,
                    values: histogram,
                    histogramType: type,
                });
                break;
            }
            case 'non_null': {
                const count = GetAgg('COUNT', column, colIndex, statsData);
                stats.columns.push({
                    type: 'non_null',
                    nonNullCount: count,
                });
                break;
            }
            case "minMax": {
                stats.columns.push({
                    type: 'non_null',
                    nonNullCount: 0,
                })
                break;
            }
            default: {
                throw new Error(`Unsupported stats type: ${statsType} for column ${column.name}`);
            }
        }
    }
    return stats;
}