import {getRelationId, Relation} from "@/model/relation";
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
    dataQuery: string;
    countQuery: string;
    parameters: RelationQueryParams;
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

export function getViewFromRelationName(connectionId: string, databaseName: string, schemaName: string, relationName: string, query: RelationQueryParams, state: TaskExecutionState): RelationState {


    const relation: Relation = {
        id: getRelationId(connectionId, databaseName, schemaName, relationName),
        name: relationName,
        schema: schemaName,
        database: databaseName,
        connectionId: connectionId,
        data: undefined,
    }

    const queryData = getQueryFromParams(relation, query);

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

export function getQueryFromParams(relation: Relation, query: RelationQueryParams): QueryData {

    const {database, schema, name} = relation;

    const {offset, limit} = query;

    const orderByColumns = Object.entries(query.sorting).map(([column, sorting]) => {
        if (!sorting) {
            return '';
        }
        return `"${column}" ${sorting}`;
    }).filter((s) => s.length > 0).join(', ');

    const oderByQuery = orderByColumns ? "ORDER BY " + orderByColumns : "";
    const relationFullName = `"${database}"."${schema}"."${name}"`;
    const queryGetData = `SELECT *
FROM ${relationFullName} ${oderByQuery}
LIMIT ${limit}
OFFSET ${offset};`;

    // count query using subquery which is the query Get data without limit and offset
    const subqueryTotalResult = queryGetData.split('LIMIT')[0];
    const queryGetCount = `SELECT COUNT(*) FROM (${subqueryTotalResult}) as subquery`;

    return {
        dataQuery: queryGetData,
        countQuery: queryGetCount,
        parameters: query,
    };
}

export function updateRelationForNewParams(relation: RelationState, newParams: RelationQueryParams, state: TaskExecutionState): RelationState {
    const query = getQueryFromParams(relation, newParams);

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
    const dataQuery = input.query.dataQuery;
    const countQuery = input.query.countQuery;

    // start a timer to measure the query duration
    const start = performance.now();
    const relationData = await executeQuery(connectionId, dataQuery);


    const countData = await executeQuery(connectionId, countQuery);
    const count = Number(countData.rows[0][0]);

    // stop the timer, get duration in s
    const end = performance.now();
    const duration = (end - start) / 1000;

    // update the view state with the new data
    return {
        ...input,
        data: relationData,
        executionState: 'success',
        lastExecutionMetaData: {
            lastExecutionDuration: duration,
            lastResultCount: count,
            lastResultOffset: input.query.parameters.offset,
        },
        viewState: updateRelationViewState(input.viewState, relationData),
    }
}