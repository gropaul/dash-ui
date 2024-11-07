import {getRelationId, Relation} from "@/model/relation";
import {useConnectionsState} from "@/state/connections.state";

export interface RelationViewState extends Relation {
    connectionId: string;

    queryData: string;
    queryCount: string;

    offset: number;
    totalCount: number;
    limit: number;
}

export async function getViewFromRelationName(relationName: string, databaseName: string | undefined, connectionId: string, offset: number = 0, limit: number = 100): Promise<RelationViewState> {

    const executeQuery = useConnectionsState.getState().executeQuery;
    const databasePrefix = databaseName ? `${databaseName}.` : '';
    const queryGetData = `SELECT *
                          FROM ${databasePrefix}"${relationName}"
                          OFFSET ${offset} LIMIT ${limit}`;

    const relationData = await executeQuery(connectionId, queryGetData);
    const columns = relationData.columns;
    const rows = relationData.rows;

    const queryGetCount = `SELECT COUNT(*)
                           FROM ${databasePrefix}"${relationName}"`;

    const countData = await executeQuery(connectionId, queryGetCount);
    const count = Number(countData.rows[0][0]);

    return {
        connectionId,
        database: databaseName,
        id: getRelationId(relationName, databaseName, connectionId),
        name: relationName,
        columns,
        rows,
        queryData: queryGetData,
        queryCount: queryGetCount,

        totalCount: count,
        limit,
        offset,
    }
}