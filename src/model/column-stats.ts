import {RelationData} from "@/model/relation";
import {ColumnStatsType, RelationState, RelationStats} from "@/model/relation-state";
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
type ExtendedAggregates = SimpleAggregates | 'HISTOGRAM' | 'TOP_K'
const DEFAULT_AGGS: SimpleAggregates[] = ['COUNT', 'MIN', 'MAX'];

const TOP_K_VALUE = 10;
const N_BINS = 31;
const DATA_TABLE_NAME = 'data';
const DATA_TRANSFORMED_TABLE_NAME = 'transformed_data';

interface QueryColumnPart {
    select: string; // cast to appropriate type, e.g. datetime to epoch_ms(Datetime) to make sure all aggs work
    baseStats: string; // COUNT(*), MIN(col), MAX(col), AVG(col), etc.
    hist?: string; // histogram(col, bins)
    availableAggs: ExtendedAggregates[];
}


function getSimpleAggFuns(column: Column, aggs: SimpleAggregates[], column_index: number): string[] {
    const column_ref = getColumnReference(column.name, column_index);
    return aggs.map(agg => {
        return `${agg}(${column_ref}) AS ${getColumnAggName(column, agg, column_index)}`;
    })
}

function getTopKFunction(column: Column, column_index: number, k: number): string {
    const ref = getColumnReference(column.name, column_index);
    const agg_ref = getColumnAggName(column, 'TOP_K', column_index);

    return `(with ags AS (SELECT ${ref}, COUNT(*)::BIGINT as cnt FROM ${DATA_TRANSFORMED_TABLE_NAME} GROUP BY ${ref} ORDER BY cnt DESC LIMIT ${k}) SELECT list({val: #1, cnt: #2::UINTEGER} ORDER BY #2 DESC) FROM ags) AS ${agg_ref}`;
}

function getHistogramFunction(column: Column, column_index: number): string {
    const column_min = getColumnAggName(column, 'MIN', column_index);
    const column_max = getColumnAggName(column, 'MAX', column_index);
    const column_hist = getColumnAggName(column, 'HISTOGRAM', column_index);
    const column_quote = getColumnReference(column.name, column_index);
    return `
        histogram(
            ${column_quote}, 
            (SELECT equi_width_bins(${column_min}, ${column_max}, ${N_BINS}, false) FROM base)
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
                baseStats: getSimpleAggFuns(column, DEFAULT_AGGS, index).join(', '),
                hist: getHistogramFunction(column, index),
                select: `${column_quote} AS ${column_reference}`,
                availableAggs: [...DEFAULT_AGGS, 'HISTOGRAM'],
            }
        case "Timestamp":
            return {
                baseStats: getSimpleAggFuns(column, DEFAULT_AGGS, index).join(', '),
                hist: getHistogramFunction(column, index),
                select: `epoch_ms(${column_quote}) AS ${column_reference}`,
                availableAggs: [...DEFAULT_AGGS, 'HISTOGRAM'],
            }
        case "String":
            const aggs = getSimpleAggFuns(column, ['COUNT'], index);
            aggs.push(getTopKFunction(column, index, TOP_K_VALUE))
            return {
                baseStats: aggs.join(', '),
                select: `${column_quote} AS ${column_reference}`,
                availableAggs: ['COUNT', 'TOP_K'],
            }
        default:
            return {
                baseStats: getSimpleAggFuns(column, ['COUNT'], index).join(', '),
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
        WITH ${DATA_TABLE_NAME} AS (${finalQuery}),
             ${DATA_TRANSFORMED_TABLE_NAME} AS (SELECT ${transforms}
                                                FROM (FROM ${DATA_TABLE_NAME} USING SAMPLE ${percentage.toFixed(2)}% (system, 42))),
             base AS MATERIALIZED (SELECT ${base_stats}
                                   FROM ${DATA_TRANSFORMED_TABLE_NAME}),
             histogram_data AS (SELECT SUM(1), ${hists}
                                FROM ${DATA_TRANSFORMED_TABLE_NAME})
        SELECT *
        FROM histogram_data,
             base;`
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
        case 'String':
            return 'top-n';
        default:
            return 'non_null';
    }
}

export function getColumnAggName(column: Column, agg: ExtendedAggregates, column_index: number, quoteName = true): string {
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
    console.log('Stats data:', buildResult.query);

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
                const count = GetAgg('COUNT', column, colIndex, statsData);
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
            case "top-n": {
                const count = GetAgg('COUNT', column, colIndex, statsData);
                const topValuesRaw = GetAgg('TOP_K', column, colIndex, statsData) as { val: any, cnt: number }[];
                console.log(`Top values for column ${column.name}:`, topValuesRaw, statsData);
                const topValues = topValuesRaw.map(item => ({
                    value: item.val,
                    count: item.cnt,
                }));
                const othersCount = Math.max(0, count - topValues.reduce((sum, item) => sum + item.count, 0));
                stats.columns.push({
                    type: 'top-n',
                    nonNullCount: count,
                    topValues: topValues,
                    othersCount: othersCount,
                })
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