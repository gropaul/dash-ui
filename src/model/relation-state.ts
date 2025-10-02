import {
    getRelationIdFromSource,
    getRelationNameFromSource,
    Relation,
    RelationData,
    RelationSource
} from "@/model/relation";
import {
    getInitViewState,
    RelationViewState,
    RelationViewType,
    updateRelationViewState
} from "@/model/relation-view-state";
import {cleanAndSplitSQL, minifySQL, turnQueryIntoSubquery} from "@/platform/sql-utils";
import {getErrorMessage} from "@/platform/error-handling";
import {ConnectionsService} from "@/state/connections/connections-service";
import {InputManager} from "@/components/editor/inputs/input-manager";
import {useRelationDataState} from "@/state/relations-data.state";
import {CHART_QUERY_LIMIT} from "@/platform/global-data";

export function getInitialParams(type: RelationViewType): ViewQueryParameters {
    return {
        type: type,
        table: {
            offset: 0,
            limit: 20,
            sorting: {},
            filters: {},
        },
        chart: {},
    };
}

export function getInitialParamsTextInput(): ViewQueryParameters {
    return {
        type: 'table',
        table: {
            offset: 0,
            limit: 1000, // for text inputs, we want to show more results
            sorting: {},
            filters: {},
        },
        chart: {},
    };
}

//! Is called when the user changes the code and reruns the query -> Reset some view parameters
export function getUpdatedParams(oldParams: ViewQueryParameters): ViewQueryParameters {

    if (oldParams.type === 'table') {
        return {
            ...oldParams,
            type: 'table',
            table: {
                ...oldParams.table,
                limit: oldParams.table.limit,
            },
        };
    } else if (oldParams.type === 'chart') {
        return {
            ...oldParams,
            type: 'chart',
            chart: oldParams.chart,
        };
    } else {
        throw new Error(`Unknown view type: ${oldParams.type}`);
    }
}


export interface ViewQueryParameters {
    type: RelationViewType;
    table: TableViewQueryParameters;
    chart: ChartTableQueryParameters;
}

export interface TableViewQueryParameters {
    offset: number;
    limit: number;
    sorting: { [key: string]: ColumnSorting | undefined };
    filters: { [key: string]: ColumnFilter | undefined };
}

export interface ChartTableQueryParameters {
    xAxis?: string;   // the name of the column to use as x-axis
    yAxes?: string[]; // the names of the columns to use as y-axes
    groupBy?: string; // the names of the columns to use as group by
}


export type TaskExecutionState = {
    state: 'not-started' | 'running' | 'success'
} | {
    state: 'error'
    error: Record<string, any>;
}

// idle: no query is running, running: query is running, success: query was successful, error: query failed
export interface QueryExecutionMetaData {
    lastExecutionDuration: number; // in s
    lastResultCount: number;
    lastResultOffset?: number;
}

export interface RelationWithQuery extends Relation {
    query: QueryData;
    executionState: TaskExecutionState;
    lastExecutionMetaData?: QueryExecutionMetaData;
}

export interface RelationState extends RelationWithQuery {
    viewState: RelationViewState;
}

export type ColumnSorting = 'ASC' | 'DESC';

export type ColumnFilterRange = {
    type: 'range';
    min?: number;
    max?: number;
};

export type ColumnFilterValues = {
    type: 'values';
    values: any[];
};

export type ColumnFilter = ColumnFilterRange | ColumnFilterValues;

export function getNextColumnSorting(current?: ColumnSorting): ColumnSorting | undefined {
    switch (current) {
        case 'ASC':
            return 'DESC';
        case 'DESC':
            return undefined;
        case undefined:
            return 'ASC';
    }
}

export async function getViewFromSource(connectionId: string, source: RelationSource, viewParams: ViewQueryParameters, state: TaskExecutionState): Promise<RelationState> {

    const name = getRelationNameFromSource(source);
    const relation: Relation = {
        name: name,
        id: getRelationIdFromSource(connectionId, source),
        source: source,
        connectionId: connectionId,
    }

    const relationBaseQuery = getBaseQueryFromSource(source);
    let queryData: QueryData;
    try {
        queryData = await getQueryFromParams(relation, viewParams, relationBaseQuery);
    } catch (e) {
        const relationWithQuery: RelationWithQuery = {
            ...relation,
            query: {
                baseQuery: relationBaseQuery,
                initialQueries: [],
                schemaQuery: undefined,
                countQuery: undefined,
                viewParameters: viewParams,
                viewQuery: relationBaseQuery
            },
            executionState: {
                state: 'error',
                error: getErrorMessage(e),
            },
            lastExecutionMetaData: undefined,
        }
        return {
            ...relationWithQuery,
            viewState: getInitViewState(name, undefined, undefined, true),
        };
    }

    const relationWithQuery: RelationWithQuery = {
        ...relation,
        query: queryData,
        executionState: state,
        lastExecutionMetaData: undefined,
    }

    const showCode = source.type === 'query';

    return {
        ...relationWithQuery,
        viewState: getInitViewState(name, undefined, [], showCode), // we will execute the query later
    };
}

export function getBaseQueryFromSource(source: RelationSource): string {
    if (source.type === 'table') {
        return minifySQL(`SELECT *
                          FROM "${source.database}"."${source.schema}"."${source.tableName}";`);
    } else if (source.type === 'file') {
        return minifySQL(`SELECT *
                          FROM '${source.path}';`);
    } else if (source.type === 'query') {
        return source.baseQuery;
    } else {
        throw new Error(`Unknown relation type: ${source}`);
    }
}

export interface QueryData {
    baseQuery: string;  // the query that the user defined, e.g. FROM basetable
    initialQueries: string[]; // the queries that must be run before the actual view query/count query
    // the query defined by the view adding sorting etc, e.g. SELECT * FROM (FROM basetable), can be undefined if the
    // base query is not viewable like CREATE TABLE
    viewQuery: string;
    schemaQuery?: string; // the query to get the schema for the view, can be undefined if deduced from the view query
    // the query getting the count for the view Query
    countQuery?: string;
    viewParameters: ViewQueryParameters;
}

interface BuildQuery {
    initialQueries: string[];
    finalQuery: string;
    viewQuery: string;
    countQuery?: string;
    schemaQuery?: string;
    baseQuery: string;
    viewParameters: ViewQueryParameters;
    // optionally return any other intermediate results if needed
}

export const getVariablesUsedByQuery = (query: string): string[] => {
    // find all matches of {{variable}}
    const regex = /{{([^}]+)}}/g;
    const matches = query.match(regex);
    if (!matches) {
        return [];
    }

    // remove the {{ and }} from the matches
    return matches.map(match => match.replace(/{{|}}/g, '').trim());
}

const setVariablesInQuery = (query: string, manger?: InputManager): string => {

    // find all matches of {{variable}}
    const regex = /{{([^}]+)}}/g;
    const matches = query.match(regex);
    if (!matches) {
        return query;
    }

    // replace all matches with the value of the variable in the inputStore
    let newQuery = query;
    for (const match of matches) {

        if (!manger) {
            throw new Error('Input manager is not defined');
        }

        const variable = match.replace(/{{|}}/g, '');
        const value = manger.getInputValue(variable);
        newQuery = newQuery.replace(match, value.value);
    }
    return newQuery;
}

// 1. A helper that does all the heavy-lifting but doesn't do the async check.
function buildQueries(
    _relation: Relation,
    query: ViewQueryParameters,
    baseSQL: string,
    inputManager?: InputManager
): BuildQuery {
    const sqlWithVariables = setVariablesInQuery(baseSQL, inputManager);
    const baseQueries = cleanAndSplitSQL(sqlWithVariables);

    const initialQueries = baseQueries.slice(0, -1);
    const finalQuery = baseQueries.at(-1);
    if (!finalQuery) {
        throw new Error('No final query found in base SQL');
    }

    // Turn final query into a subquery
    const finalQueryAsSubQuery = turnQueryIntoSubquery(finalQuery);

    // Build a count query
    let countQuery = undefined;
    let viewQuery;
    let schemaQuery = undefined;
    if (query.type === 'table') {
        viewQuery = buildTableQuery(query, finalQueryAsSubQuery);
        const filterQuery = buildFilterWhereClause(query.table.filters, 'subquery');
        countQuery = `
            SELECT COUNT(*)
            FROM ${finalQueryAsSubQuery} as subquery ${filterQuery}
        `;
    } else if (query.type === 'chart') {
        const [lViewQuery, lSchemaQuery] = buildChartQuery(query, finalQueryAsSubQuery);
        viewQuery = lViewQuery;
        schemaQuery = lSchemaQuery;
    } else {
        throw new Error(`Unknown view type: ${query.type}`);
    }

    return {
        initialQueries,
        finalQuery,
        viewQuery,
        schemaQuery,
        countQuery,
        baseQuery: baseSQL,
        viewParameters: query,
    };
}


export function buildChartQuery(viewParams: ViewQueryParameters, finalQueryAsSubQuery: string): [string, string?] {
    const chartViewParams = viewParams.chart;

    const schemaQuery = `SELECT * FROM ${finalQueryAsSubQuery} LIMIT 1;`;


    if (chartViewParams.groupBy && chartViewParams.xAxis && chartViewParams.yAxes?.length === 1) {
        // build group by query
        const groupBy = chartViewParams.groupBy;
        const xAxis = chartViewParams.xAxis;
        const yAxis = chartViewParams.yAxes[0];

        const viewQuery = `
            WITH data AS (
                SELECT ${xAxis}, ${groupBy}, ${yAxis}
                FROM ${finalQueryAsSubQuery}
            ),
            dash_row_number_ids AS (
                SELECT range as dash_row_number_id FROM range((SELECT COUNT(*) FROM data))
            ),
            data_with_ids AS (
                SELECT d.*, dash_row_number_ids.dash_row_number_id
                FROM data d
                POSITIONAL JOIN dash_row_number_ids 
            ), 
            data_with_ids_pivot AS (
                PIVOT data_with_ids
                ON ${groupBy}
                USING FIRST(${yAxis})
                GROUP BY ${xAxis}
                ORDER BY ${xAxis}
            )
            SELECT COLUMNS(c -> c NOT LIKE '%dash_row_number_id%') 
            FROM data_with_ids_pivot
            LIMIT ${CHART_QUERY_LIMIT};
        `;
        return [viewQuery, schemaQuery];
    } else if (chartViewParams.xAxis && chartViewParams.yAxes && chartViewParams.yAxes.length > 0) {
        // simple select x and y axes
        const xAxis = chartViewParams.xAxis;
        const yAxes = chartViewParams.yAxes.join(', ');

        const viewQuery = `
            SELECT ${xAxis}, ${yAxes}
            FROM ${finalQueryAsSubQuery}
             LIMIT ${CHART_QUERY_LIMIT};
        `

        return [viewQuery, schemaQuery];
    } else {
        console.warn('Chart query not fully configured, falling back to table view');
        return [`SELECT * FROM ${finalQueryAsSubQuery} LIMIT ${CHART_QUERY_LIMIT};`, schemaQuery];
    }

}

export function buildTableQuery(viewParams: ViewQueryParameters, finalQueryAsSubQuery: string): string {
    const tableViewParams = viewParams.table;
    const {offset, limit} = tableViewParams;

    // Build "ORDER BY ..." from query.sorting
    const orderByColumns = Object.entries(tableViewParams.sorting)
        .map(([column, sorting]) => (sorting ? `"${column}" ${sorting}` : ''))
        .filter(Boolean)
        .join(', ');

    const orderByQuery = orderByColumns ? 'ORDER BY ' + orderByColumns : '';
    const filterQuery = buildFilterWhereClause(tableViewParams.filters, 'subquery');
    return `
        SELECT *
        FROM ${finalQueryAsSubQuery} as subquery ${filterQuery} ${orderByQuery} LIMIT ${limit}
        OFFSET ${offset};
    `;
}

function buildFilterWhereClause(filters?: { [key: string]: ColumnFilter | undefined }, alias?: string): string {
    if (!filters) return '';
    const conditions: string[] = [];
    for (const [column, filter] of Object.entries(filters)) {
        if (!filter) continue;
        const colRef = alias ? `${alias}."${column}"` : `"${column}"`;
        if (filter.type === 'range') {
            if (filter.min !== undefined) {
                conditions.push(`${colRef} >= ${filter.min}`);
            }
            if (filter.max !== undefined) {
                conditions.push(`${colRef} <= ${filter.max}`);
            }
        } else if (filter.type === 'values') {
            if (filter.values.length > 0) {
                const vals = filter.values
                    .map((v) =>
                        typeof v === 'number'
                            ? v
                            : `'${String(v).replace(/'/g, "''")}'`
                    )
                    .join(', ');
                conditions.push(`${colRef} IN (${vals})`);
            }
        }
    }
    if (conditions.length === 0) return '';
    return 'WHERE ' + conditions.join(' AND ');
}

// 2. The async version that checks executability
export async function getQueryFromParams(
    relation: Relation,
    query: ViewQueryParameters,
    baseSQL: string,
    inputManager?: InputManager
): Promise<QueryData> {
    // Build the queries first
    const {
        initialQueries,
        finalQuery,
        viewQuery,
        countQuery,
        baseQuery,
        viewParameters,
        schemaQuery,
    } = buildQueries(relation, query, baseSQL, inputManager);

    // Then do your async check:
    const executable = await ConnectionsService
        .getInstance()
        .checkIfQueryIsExecutable(viewQuery);

    // If not executable, fallback
    return {
        schemaQuery,
        countQuery: executable ? countQuery : undefined,
        viewQuery: executable ? viewQuery : finalQuery,
        initialQueries,
        baseQuery,
        viewParameters,
    };
}

// 3. The sync version that SKIPS the check
export function getQueryFromParamsUnchecked(
    relation: Relation,
    query: ViewQueryParameters,
    baseSQL: string
): QueryData {
    // Same shared build
    const {
        initialQueries,
        finalQuery,
        viewQuery,
        schemaQuery,
        countQuery,
        baseQuery,
        viewParameters,
    } = buildQueries(relation, query, baseSQL);

    // No check => always return viewQuery & countQuery
    return {
        countQuery,
        viewQuery,
        schemaQuery,
        initialQueries,
        baseQuery,
        viewParameters,
    };
}


export function setRelationLoading(relation: RelationState): RelationState {
    return {
        ...relation,
        executionState: {
            state: 'running',
        },
    };
}

export async function updateRelationQueryForParams(relation: RelationState, newParams: ViewQueryParameters, inputManger?: InputManager): Promise<RelationState> {
    const baseQuery = relation.query.baseQuery;
    const query = await getQueryFromParams(relation, newParams, baseQuery, inputManger);

    return {
        ...relation,
        query: query,
        executionState: relation.executionState,
    };

}

export function returnEmptyErrorState(relation: RelationState, error: unknown): RelationState {
    return {
        ...relation,
        viewState: {
            ...relation.viewState,
            codeFenceState: {
                ...relation.viewState.codeFenceState,
                show: true,
            },
        },
        executionState: {
            state: 'error',
            error: getErrorMessage(error),
        },
    }
}


// executes the query and updates the view state
export async function executeQueryOfRelationState(input: RelationState): Promise<RelationState> {

    const viewQuery = input.query.viewQuery;
    const countQuery = input.query.countQuery;
    const schemaQuery = input.query.schemaQuery;

    // start a timer to measure the query duration
    const start = performance.now();

    // first execute the initial queries
    for (const query of input.query.initialQueries) {
        try {
            await ConnectionsService.getInstance().executeQuery(query);
        } catch (e) {
            return returnEmptyErrorState(input, e);
        }
    }

    let viewData: RelationData;
    let countData;

    if (viewQuery) {
        try {
            const cacheResult = await useRelationDataState.getState().updateDataFromQuery(input.id, viewQuery);
            viewData = cacheResult.data;
        } catch (e) {
            return returnEmptyErrorState(input, e);
        }
    } else {
        viewData = {
            columns: [],
            rows: [],
        };

        useRelationDataState.getState().updateData(input.id, viewData);
    }

    let schemaColumns = [];
    if (schemaQuery) {
        try {
            const schemaData = await ConnectionsService.getInstance().executeQuery(schemaQuery);
            schemaColumns = schemaData.columns;

        } catch (e) {
            return returnEmptyErrorState(input, e);
        }
    } else {
        schemaColumns = viewData.columns;
    }

    if (countQuery) {
        try {
            countData = await ConnectionsService.getInstance().executeQuery(countQuery);
        } catch (e) {
            return returnEmptyErrorState(input, e);
        }
    } else {
        countData = {
            columns: [],
            rows: [[0]],
        };
    }

    const count = Number(countData.rows[0][0]);

    // stop the timer, get duration in s
    const end = performance.now();
    const duration = (end - start) / 1000;

    input.viewState.schema = schemaColumns;
    // update the view state with the new data
    return {
        ...input,
        executionState: {
            state: 'success',
        },
        lastExecutionMetaData: {
            lastExecutionDuration: duration,
            lastResultCount: count,
            lastResultOffset: input.query.viewParameters.table.offset,
        },
        viewState: updateRelationViewState(input.viewState, viewData),
    }
}