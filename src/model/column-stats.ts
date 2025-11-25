import {RelationData} from "@/model/relation";
import {ColumnStats, ColumnStatsHistogram, ColumnStatsType, RelationState} from "@/model/relation-state";
import {Column} from "@/model/data-source-connection";
import {ConnectionsService} from "@/state/connections/connections-service";
import {ValueType} from "@/model/value-type";

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


function getAggFunctions(column: Column, aggs: SimpleAggregates[]): string[] {
    return aggs.map(agg => {
        return `${agg}(${column.name}) AS ${column.name}_${agg.toLowerCase()}`;
    })
}

function getHistogramFunction(column: Column): string {
    const column_min = `${column.name}_min`;
    const column_max = `${column.name}_max`;
    return `
        histogram(
            ${column.name}, 
            (SELECT equi_width_bins(${column_min}, ${column_max}, 21, false) FROM bounds)
        ) AS ${column.name}_histogram`;

}

function GetQueryForColumn(column: Column): QueryColumnPart {
    switch (column.type) {
        case "Integer":
        case "Float":
            return {
                baseStats: getAggFunctions(column, DEFAULT_AGGS).join(', '),
                hist: getHistogramFunction(column),
                select: column.name,
                availableAggs: [...DEFAULT_AGGS, 'HISTOGRAM'],
            }
        case "Timestamp":
            return {
                baseStats: getAggFunctions(column, DEFAULT_AGGS).join(', '),
                hist: getHistogramFunction(column),
                select: `epoch_ms(${column.name}) AS ${column.name}`,
                availableAggs: [...DEFAULT_AGGS, 'HISTOGRAM'],
            }
        default:
            return {
                baseStats: getAggFunctions(column, ['COUNT']).join(', '),
                select: column.name,
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
                                  FROM data tablesample ${percentage.toFixed(2)}%),
             bounds AS MATERIALIZED (SELECT ${base_stats}
                                     FROM transformed_data),
             histogram_data AS (SELECT ${hists}
                                FROM transformed_data)
        SELECT *
        FROM histogram_data,
             bounds;`
    console.log(`${query}`);
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

export function GetAgg(agg: ExtendedAggregates, column: Column, data: RelationData): any {
    const aggName = `${column.name}_${agg.toLowerCase()}`;
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

    let stats: ColumnStats = {
        stats: [],
    }

    console.log("Stats query result:", statsData);

    for (let colIndex = 0; colIndex < data.columns.length; colIndex++) {
        const column = data.columns[colIndex];
        const part = buildResult.parts[colIndex];
        const statsType = GetStatsTypeForValueType(column.type);

        switch (statsType) {
            case 'histogram': {
                const count = GetAgg('COUNT', column, statsData);
                const min = GetAgg('MIN', column, statsData);
                const max = GetAgg('MAX', column, statsData);
                const histogram = GetAgg('HISTOGRAM', column, statsData);

                stats.stats.push({
                    type: 'histogram',
                    nonNullCount: count,
                    min: min,
                    max: max,
                    values: histogram,
                });
                break;
            }
            case 'non_null': {
                const count = GetAgg('COUNT', column, statsData);
                stats.stats.push({
                    type: 'non_null',
                    nonNullCount: count,
                });
                break;
            }
            case "minMax": {
                stats.stats.push({
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

    console.log("Computed column stats:", stats);

    return stats;
}