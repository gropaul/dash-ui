import {getRelationId, Relation} from "@/model/relation";
import {useConnectionsState} from "@/state/connections.state";

export function getDefaultQueryParams(): RelationQueryParams {
    return {
        offset: 0,
        limit: 100,
        sorting: {},
    };
}


export interface RelationQueryParams {
    offset: number;
    limit: number;
    sorting: { [key: string]: ColumnSorting | undefined };
}

export interface RelationState extends Relation {
    queryData: string;
    queryCount: string;
    queryDuration: number; // in s

    totalCount: number;

    queryParameters: RelationQueryParams;
}

export type ColumnSorting = 'asc' | 'desc';

export function getNextColumnSorting(current?: ColumnSorting): ColumnSorting | undefined {
    switch (current) {
        case 'asc':
            return 'desc';
        case 'desc':
            return undefined;
        case undefined:
            return 'asc';
    }
}


export async function getViewFromRelation(relation: Relation, query: RelationQueryParams): Promise<RelationState> {
    return getViewFromRelationName(relation.connectionId, relation.database, relation.schema, relation.name, query);
}

export async function getViewFromRelationName(connectionId: string, databaseName: string, schemaName: string, relationName: string, query: RelationQueryParams): Promise<RelationState> {

    const {offset, limit} = query;

    // start a timer to measure the query duration
    const start = performance.now();

    const executeQuery = useConnectionsState.getState().executeQuery;

    const orderByColumns = Object.entries(query.sorting).map(([column, sorting]) => {
        if (!sorting) {
            return '';
        }
        return `${column} ${sorting}`;
    }).filter((s) => s.length > 0).join(', ');

    const oderByQuery = orderByColumns ? "ORDER BY " + orderByColumns : "";

    const relationFullName = `"${databaseName}"."${schemaName}"."${relationName}"`;

    const queryGetData = `SELECT *
                          FROM ${relationFullName} ${oderByQuery} LIMIT ${limit}
                          OFFSET ${offset}`;

    const relationData = await executeQuery(connectionId, queryGetData);
    const columns = relationData.columns;
    const rows = relationData.rows;

    const queryGetCount = `SELECT COUNT(*)
                           FROM ${relationFullName}`;

    const countData = await executeQuery(connectionId, queryGetCount);
    const count = Number(countData.rows[0][0]);

    // stop the timer, get duration in s
    const end = performance.now();
    const duration = (end - start) / 1000;

    return {

        id: getRelationId(connectionId,  databaseName, schemaName, relationName),
        name: relationName,
        schema: schemaName,
        database: databaseName,
        connectionId: connectionId,

        columns,
        rows,
        queryData: queryGetData,
        queryCount: queryGetCount,
        queryDuration: duration,
        totalCount: count,
        queryParameters: query,
    }
}