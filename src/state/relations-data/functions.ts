import {RelationData} from "@/model/relation";
import {ConnectionsService} from "@/state/connections-service";
import {DEFAULT_STATE_SCHEMA_NAME} from "@/platform/global-data";
import {CacheResult} from "@/state/relations-data.state";

function GetFullViewName(id: string): string {
    const viewName = `cache-${id}`;
    return `"${DEFAULT_STATE_SCHEMA_NAME}"."${viewName}"`;

}

function getMaterializedViewFromQuery(id: string, query: string, readonly: boolean): string {
    const tmpPhrase = readonly ? 'TEMP TABLE' : 'TABLE';
    const tableName = GetFullViewName(id);

    // remove the semicolon in the query if it exists (can be everywhere in the query)
    query = query.trim().replace(/;/g, '');

    return `CREATE OR REPLACE ${tmpPhrase} ${tableName} AS (${query});`;
}

export function loadCache(id: string): Promise<RelationData> {
    const viewName = GetFullViewName(id);
    return ConnectionsService.getInstance().executeQuery(`SELECT * FROM ${viewName};`);
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
        console.log('Cache updated successfully for relation:', id);
        return {
            data: cacheData,
            wasCached: true
        };
    } catch (error) {
        // execute the query directly as we cannot cache it
        const data = await connectionsService.executeQuery(query);
        console.error('Failed to create materialized view, executing query directly:', error, query);
        return {
            data: data,
            wasCached: false
        }
    }


}