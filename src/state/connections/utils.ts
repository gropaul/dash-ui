import {splitSQL} from "@/platform/sql-utils";
import {RelationData} from "@/model/relation";
import {AsyncQueue} from "@/platform/async-queue";


export function enqueueStatements(sql: string, queue: AsyncQueue<string, RelationData>): Promise<RelationData> {
    const queries = splitSQL(sql)
    const lastQuery = queries.pop();
    if (!lastQuery){
        throw Error("SQL does not contain any query")
    }
    for (const query in queries){
        queue.add(query) // no await as we don't want other queries to sneak in!
    }
    return queue.add(lastQuery);
}