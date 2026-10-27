import {getRandomId} from "@/platform/id-utils";
import {RelationSourceQuery} from "@/model/relation";
import {useWorkspace} from "@/state/workspace/workspace.state";
import {createQueryFileFromSource} from "@/state/workspace/query-files";
import {ConnectionsService} from "@/state/connections/connections-service";


export async function showExampleQuery(delay: number = 1000) {
    await new Promise(resolve => setTimeout(resolve, delay));
    if (Object.keys(useWorkspace.getState().files).length === 0) {
        const id = ConnectionsService.getInstance().getDatabaseConnection().id;
        showExampleQueryInternal(id);
    }
}

export function showExampleQueryInternal(connectionId: string) {
    // add example query
    const randomId = getRandomId();
    const baseQuery = `-- Directly query Parquet file from GitHub
SELECT
StationName,
count(*) AS num_services
FROM 'https://raw.githubusercontent.com/gropaul/dash-ui/main/test/data/services-2025-38.parquet'
GROUP BY ALL
ORDER BY num_services DESC
LIMIT 10;`;
    const source: RelationSourceQuery = {
        type: "query",
        baseQuery: baseQuery,
        id: randomId,
        name: "Train Station Services"
    }
    void createQueryFileFromSource(source);
}