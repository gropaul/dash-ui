import {splitSQL} from "@/platform/sql-utils";
import {RelationData} from "@/model/relation";
import {AsyncQueue} from "@/platform/async-queue";
import {QueryInput} from "@/state/connections/duckdb-wasm";
import {DatabaseConnection} from "@/model/database-connection";
import {getStorageMode} from "@/state/connections/duckdb-wasm/duckdb-wasm-provider";


export async function attachDatabase(
    connection: DatabaseConnection,
    fileName: string,
    dbName: string,
    readonly?: boolean
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