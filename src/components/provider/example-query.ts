import {getRandomId} from "@/platform/id-utils";
import {RelationSourceQuery} from "@/model/relation";
import {useRelationsState} from "@/state/relations.state";
import {DEFAULT_RELATION_VIEW_PATH} from "@/platform/global-data";


export function showExampleQuery(connectionId: string) {
    // add example query
    const randomId = getRandomId();
    const baseQuery = `-- Directly query Parquet file in S3
SELECT
station_name,
count(*) AS num_services
FROM 's3://duckdb-blobs/train_services.parquet'
-- FROM train_services
GROUP BY ALL
ORDER BY num_services DESC
LIMIT 10;`;
    const source: RelationSourceQuery = {
        type: "query",
        baseQuery: baseQuery,
        id: randomId,
        name: "Train Station Services"
    }
    const showRelationFromSource = useRelationsState.getState().showRelationFromSource;
    showRelationFromSource(connectionId, source, DEFAULT_RELATION_VIEW_PATH);
}