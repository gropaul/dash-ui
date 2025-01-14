import {getRelationIdFromSource, getRelationNameFromSource, Relation, RelationSource} from "@/model/relation";
import {useConnectionsState} from "@/state/connections.state";
import {getInitViewState, RelationViewState, updateRelationViewState} from "@/model/relation-view-state";
import {cleanAndSplitSQL, minifySQL, turnQueryIntoSubquery} from "@/platform/sql-utils";
import {getErrorMessage} from "@/platform/error-handling";
import {ConnectionsService} from "@/state/connections/connections-service";

export function getDefaultQueryParams(oldLimit?: number): RelationQueryParams {

    const limit = oldLimit ?? 50;
    return {
        offset: 0,
        limit: limit,
        sorting: {},
    };
}

export interface RelationQueryParams {
    offset: number;
    limit: number;
    sorting: { [key: string]: ColumnSorting | undefined };
}

export interface QueryData {
    baseQuery: string;  // the query that the user defined, e.g. FROM basetable
    initialQueries: string[]; // the queries that must be run before the actual view query/count query
    // the query defined by the view adding sorting etc, e.g. SELECT * FROM (FROM basetable), can be undefined if the
    // base query is not viewable like CREATE TABLE
    viewQuery: string;
    // the query getting the count for the view Query
    countQuery: string;
    viewParameters: RelationQueryParams;
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
    lastResultOffset: number;
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

export async function getViewFromSource(connectionId: string, source: RelationSource, viewParams: RelationQueryParams, state: TaskExecutionState): Promise<RelationState> {

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
        viewState: getInitViewState(name, relationWithQuery.data, showCode),
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

export async function getQueryFromParams(relation: Relation, query: RelationQueryParams, baseSQL: string): Promise<QueryData> {

    const {offset, limit} = query;

    const orderByColumns = Object.entries(query.sorting).map(([column, sorting]) => {
        if (!sorting) {
            return '';
        }
        return `"${column}" ${sorting}`;
    }).filter((s) => s.length > 0).join(', ');

    const baseQueries = cleanAndSplitSQL(baseSQL);

    // Separate the base queries into initial queries and the final query
    const initialQueries = baseQueries.slice(0, -1);
    const finalQuery = baseQueries.at(-1);

    if (!finalQuery) {
        throw new Error('No final query found in base SQL');
    }

    const finalQueryAsSubQuery = turnQueryIntoSubquery(finalQuery);
    const orderByQuery = orderByColumns ? "ORDER BY " + orderByColumns : "";
    const viewQuery = `
        SELECT *
        FROM ${finalQueryAsSubQuery} ${orderByQuery} LIMIT ${limit}
        OFFSET ${offset};
    `;

    // check if viewQuery is executable as e.g. if base query is something like CREATE TABLE, the view query will be invalid,
    // and we should only execute the base query, same for the count query
    const executable = await ConnectionsService.getInstance().checkIfQueryIsExecutable(relation.connectionId, viewQuery);


    // count query using subquery which is the query Get data without limit and offset
    const countQuery = `SELECT COUNT(*)
                        FROM ${finalQueryAsSubQuery} as subquery`;

    return {
        countQuery: executable ? countQuery : `SELECT 0`,
        viewQuery: executable ? viewQuery : finalQuery,
        initialQueries: initialQueries,
        baseQuery: baseSQL,
        viewParameters: query,
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

export async function updateRelationQueryForParams(relation: RelationState, newParams: RelationQueryParams, state?: TaskExecutionState): Promise<RelationState> {
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

    const executeQuery = useConnectionsState.getState().executeQuery;
    const connectionId = input.connectionId;
    const viewQuery = input.query.viewQuery;
    const countQuery = input.query.countQuery;

    // start a timer to measure the query duration
    const start = performance.now();

    // first execute the initial queries
    for (const query of input.query.initialQueries) {
        try {
            await executeQuery(connectionId, query);
        } catch (e) {
            return returnEmptyErrorState(input, e);
        }
    }

    let viewData;
    let countData;

    if (viewQuery) {
        try {
            viewData = await executeQuery(connectionId, viewQuery);
        } catch (e) {
            return returnEmptyErrorState(input, e);
        }
    } else {
        viewData = {
            columns: [],
            rows: [],
        };
    }

    if (countQuery) {
        try {
            countData = await executeQuery(connectionId, countQuery);
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
            lastResultOffset: input.query.viewParameters.offset,
        },
        viewState: updateRelationViewState(input.viewState, viewData),
    }
}