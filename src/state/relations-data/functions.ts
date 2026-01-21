import {RelationData} from "@/model/relation";
import {ConnectionsService} from "@/state/connections/connections-service";
import {DEFAULT_STATE_SCHEMA_NAME} from "@/platform/global-data";
import {CacheResult} from "@/state/relations-data.state";
import {removeSemicolon} from "@/platform/sql-utils";

function GetFullViewName(id: string): string {
    const viewName = `cache-${id}`;
    // return `"${DEFAULT_STATE_SCHEMA_NAME}"."${viewName}"`;
    // we can't use the schema as we can't create a temp schema
    return `"${DEFAULT_STATE_SCHEMA_NAME}_dash_${viewName}"`;

}

function getMaterializedViewFromQuery(id: string, query: string, readonly: boolean): string {
    const TEMP_TABLE = readonly ? 'TEMP TABLE' : 'TABLE';
    const tableName = GetFullViewName(id);

    // remove the semicolon in the query if it exists (can be everywhere in the query)
    query = removeSemicolon(query);

    return `CREATE OR REPLACE ${TEMP_TABLE} ${tableName} AS (${query});`;
}

export async function loadCache(id: string): Promise<RelationData | undefined> {
    try {
        const viewName = GetFullViewName(id);
        return await ConnectionsService.getInstance().executeQuery(`SELECT * FROM ${viewName};`);
    } catch (error) {
        return Promise.resolve(undefined);
    }
}

export async function deleteCache(id: string): Promise<RelationData> {
    const viewName = GetFullViewName(id);
    return ConnectionsService.getInstance().executeQuery(`DROP TABLE IF EXISTS ${viewName};`);
}

// the query *must* be a select query, otherwise it will not work
export async function updateCache(id: string, query: string): Promise<CacheResult> {

    const connectionsService = ConnectionsService.getInstance();

    // Check if the connection is ready and whether we should use a temporary or permanent table
    const con = connectionsService.getDatabaseConnection();
    if (con.storageInfo.state !== 'loaded') {
        throw new Error('Database connection is not ready or not loaded.');
    }
    const isReadonly = con.storageInfo.databaseReadonly;

    // try to create the materialized view, this can fail if the query is not a select query
    try {
        const materializedViewQuery = getMaterializedViewFromQuery(id, query, isReadonly);
        await connectionsService.executeQuery(materializedViewQuery);

        const cacheData = await loadCache(id);

        if (!cacheData) {
            throw new Error('Failed to load cache data after creating materialized view.');
        }

        return {
            data: cacheData,
            wasCached: true
        };
    } catch (error) {
        // only catch if it is a parsing error, otherwise rethrow
        // execute the query directly as we cannot cache it
        const message = (error as Error).message;
        const isParsingError = message.includes('Parser Error');

        if (!isParsingError) {
            throw error;
        }

        const data = await connectionsService.executeQuery(query);
        return {
            data: data,
            wasCached: false
        }
    }


}