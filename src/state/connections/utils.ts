import {splitSQL} from "@/platform/sql-utils";
import {RelationData} from "@/model/relation";
import {AsyncQueue} from "@/platform/async-queue";
import {QueryInput} from "@/state/connections/duckdb-wasm";


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