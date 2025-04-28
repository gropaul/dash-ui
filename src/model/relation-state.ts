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
import {ConnectionsService} from "@/state/connections-service";

export function getInitialParams(): ViewQueryParameters {
    return {
        type: 'table',
        table: {
            offset: 0,
            limit: 100,
            sorting: {},
        },
        chart: {},
    };
}

//! Is called when the user changes the code and reruns the query -> Reset some view parameters
export function getUpdatedParams(oldParams: ViewQueryParameters): ViewQueryParameters {

    console.log('getUpdatedParams', oldParams);
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
        data: undefined,
    }

    const relationBaseQuery = getBaseQueryFromSource(source);

    const queryData = await getQueryFromParams(relation, viewParams, relationBaseQuery);

    const relationWithQuery: RelationWithQuery = {
        ...relation,
        query: queryData,
        executionState: state,
        lastExecutionMetaData: undefined,
    }

    const showCode = source.type === 'query';

    return {
        ...relationWithQuery,
        viewState: getInitViewState(name, relationWithQuery.data, [], showCode),
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
};

// 1. A helper that does all the heavy-lifting but doesn't do the async check.
function buildQueries(
    _relation: Relation,
    query: ViewQueryParameters,
    baseSQL: string
): BuildQuery {

    const baseQueries = cleanAndSplitSQL(baseSQL);

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
        countQuery = `
            SELECT COUNT(*)
            FROM ${finalQueryAsSubQuery} as subquery
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

    const baseQuery = `
        SELECT *
        FROM ${finalQueryAsSubQuery};
    `;

    if (chartViewParams.groupBy && chartViewParams.xAxis && chartViewParams.yAxes?.length === 1) {
        const groupBy = chartViewParams.groupBy;
        const xAxis = chartViewParams.xAxis;
        const yAxis = chartViewParams.yAxes[0];

        // in this case, we need the base table to get the schema
        const schemaQuery = `
            SELECT *
            FROM ${finalQueryAsSubQuery}
            LIMIT 1;
        `;

        return [`
            WITH data AS (SELECT ${xAxis}, ${groupBy}, ${yAxis}
                          FROM ${finalQueryAsSubQuery})
                PIVOT data
            ON ${groupBy}
                USING FIRST (${yAxis});
        `, schemaQuery];
    }
    return [baseQuery, undefined];
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
    return `
        SELECT *
        FROM ${finalQueryAsSubQuery} ${orderByQuery} LIMIT ${limit}
        OFFSET ${offset};
    `;
}

// 2. The async version that checks executability
export async function getQueryFromParams(
    relation: Relation,
    query: ViewQueryParameters,
    baseSQL: string
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
    } = buildQueries(relation, query, baseSQL);

    // Then do your async check:
    const executable = await ConnectionsService.getInstance().checkIfQueryIsExecutable(
        viewQuery
    );

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

export async function updateRelationQueryForParams(relation: RelationState, newParams: ViewQueryParameters, state?: TaskExecutionState): Promise<RelationState> {
    const baseQuery = relation.query.baseQuery;
    const query = await getQueryFromParams(relation, newParams, baseQuery);

    return {
        ...relation,
        query: query,
        executionState: state ?? relation.executionState,
    };

}

function returnEmptyErrorState(relation: RelationState, error: unknown): RelationState {
    return {
        ...relation,
        data: undefined,
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
            viewData = await ConnectionsService.getInstance().executeQuery(viewQuery);
        } catch (e) {
            return returnEmptyErrorState(input, e);
        }
    } else {
        viewData = {
            columns: [],
            rows: [],
        };
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

    input.viewState.selectableColumns = schemaColumns;
    // update the view state with the new data
    return {
        ...input,
        data: viewData,
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