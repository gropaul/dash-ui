import {splitSQL} from "@/platform/sql-utils";
import {RelationData} from "@/model/relation";
import {AsyncQueue} from "@/platform/async-queue";
import {QueryInput} from "@/state/connections/duckdb-wasm";
import {DatabaseConnection} from "@/model/database-connection";
import {getStorageMode} from "@/state/connections/duckdb-wasm/duckdb-wasm-provider";
import {DASH_CACHE_SCHEMA, DASH_CATALOG, DASH_DATABASE_FILE_NAME, DASH_REFS_SCHEMA} from "@/platform/global-data";

/**
 * Attach the dash catalog and create all required schemas inside it.
 * Idempotent — safe to call on every connection check.
 */
export async function initDashCatalog(connection: DatabaseConnection): Promise<void> {
    try {
        await attachDatabase(connection, DASH_DATABASE_FILE_NAME, DASH_CATALOG, false);
        await connection.executeQuery(`CREATE SCHEMA IF NOT EXISTS ${DASH_CATALOG}.${DASH_CACHE_SCHEMA};`, false);
        await connection.executeQuery(`CREATE SCHEMA IF NOT EXISTS ${DASH_CATALOG}.${DASH_REFS_SCHEMA};`, false);
        console.log('Dash catalog initialized successfully');
    } catch (error) {
        console.error('Error initializing Dash catalog:', error);
        throw error;
    }
}

export async function attachDatabase(
    connection: DatabaseConnection,
    fileName: string,
    dbName: string,
    readonly: boolean
): Promise<void> {
    const isWasm = connection.type === 'duckdb-wasm' || connection.type === 'duckdb-wasm-motherduck';
    if (isWasm && getStorageMode() === 'memory') {
        await connection.executeQuery(`ATTACH IF NOT EXISTS ':memory:' AS ${dbName};`, false);
        return;
    }
    const pathPrefix = isWasm ? 'opfs://' : '';
    const readonlyClause = readonly ? ' (READ_ONLY)' : '(READ_WRITE)';
    await connection.executeQuery(`ATTACH IF NOT EXISTS '${pathPrefix}${fileName}' AS ${dbName}${readonlyClause};`, false);
}

export function enqueueStatements(input: QueryInput, queue: AsyncQueue<QueryInput, RelationData>): Promise<RelationData> {
    const {query, readOnly} = input;
    const queries = splitSQL(query)
    const lastQuery = queries.pop();
    if (!lastQuery){
        throw Error("SQL does not contain any query")
    }
    for (const statement of queries){
        queue.add({query: statement, readOnly});
    }
    return queue.add({query: lastQuery, readOnly});
}