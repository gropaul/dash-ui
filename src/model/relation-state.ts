import {getRelationIdFromSource, getRelationNameFromSource, Relation, RelationSource} from "@/model/relation";
import {useConnectionsState} from "@/state/connections.state";
import {getInitViewState, RelationViewState, updateRelationViewState} from "@/model/relation-view-state";

export function getDefaultQueryParams(): RelationQueryParams {
    return {
        offset: 0,
        limit: 50,
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
    viewQuery: string;  // the query defined by the view adding sorting etc, e.g. SELECT * FROM (FROM basetable)
    countQuery: string; // the query getting the count for the view Query
    viewParameters: RelationQueryParams;
}

// idle: no query is running, running: query is running, success: query was successful, error: query failed
export type TaskExecutionState = 'not-started' | 'running' | 'success' | 'error';

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

export function getViewFromSource(connectionId: string, source: RelationSource, viewParams: RelationQueryParams, state: TaskExecutionState): RelationState {

    const relation: Relation = {
        name: getRelationNameFromSource(source),
        id: getRelationIdFromSource(connectionId, source),
        source: source,
        connectionId: connectionId,
        data: undefined,
    }

    const relationBaseQuery = getBaseQueryFromSource(source);

    const queryData = getQueryFromParams(relation, viewParams, relationBaseQuery);

    const relationWithQuery: RelationWithQuery = {
        ...relation,
        query: queryData,
        executionState: state,
        lastExecutionMetaData: undefined,
    }

    return {
        ...relationWithQuery,
        viewState: getInitViewState(relationWithQuery.data),
    };
}

export function getBaseQueryFromSource(source: RelationSource): string {
    if (source.type === 'table') {
        return `SELECT * FROM "${source.database}"."${source.schema}"."${source.tableName}"`;
    } else {
        return `SELECT * FROM '${source.path}'`;
    }
}

export function getQueryFromParams(relation: Relation, query: RelationQueryParams, baseQuery: string): QueryData {

    const {offset, limit} = query;

    const orderByColumns = Object.entries(query.sorting).map(([column, sorting]) => {
        if (!sorting) {
            return '';
        }
        return `"${column}" ${sorting}`;
    }).filter((s) => s.length > 0).join(', ');

    const oderByQuery = orderByColumns ? "ORDER BY " + orderByColumns : "";
    const viewQuery = `SELECT *
FROM (${baseQuery}) ${oderByQuery}
LIMIT ${limit}
OFFSET ${offset};`;

    // count query using subquery which is the query Get data without limit and offset
    const countQuery = `SELECT COUNT(*) FROM (${baseQuery}) as subquery`;

    return {
        baseQuery: baseQuery,
        viewQuery: viewQuery,
        countQuery: countQuery,
        viewParameters: query,
    };
}

export function updateRelationQueryForParams(relation: RelationState, newParams: RelationQueryParams, state: TaskExecutionState): RelationState {
    const baseQuery = relation.query.baseQuery;
    const query = getQueryFromParams(relation, newParams, baseQuery);

    return {
        ...relation,
        query: query,
        executionState: state,
    };

}

// executes the query and updates the view state
export async function executeQueryOfRelationState(input: RelationState): Promise<RelationState> {

    const executeQuery = useConnectionsState.getState().executeQuery;
    const connectionId = input.connectionId;
    const viewQuery = input.query.viewQuery;
    const countQuery = input.query.countQuery;

    // start a timer to measure the query duration
    const start = performance.now();
    const viewData = await executeQuery(connectionId, viewQuery);


    const countData = await executeQuery(connectionId, countQuery);
    const count = Number(countData.rows[0][0]);

    // stop the timer, get duration in s
    const end = performance.now();
    const duration = (end - start) / 1000;

    // update the view state with the new data
    return {
        ...input,
        data: viewData,
        executionState: 'success',
        lastExecutionMetaData: {
            lastExecutionDuration: duration,
            lastResultCount: count,
            lastResultOffset: input.query.viewParameters.offset,
        },
        viewState: updateRelationViewState(input.viewState, viewData),
    }
}