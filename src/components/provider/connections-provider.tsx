'use client';

import {useEffect} from "react";
import {useConnectionsState} from "@/state/connections.state";
import {getRandomId} from "@/platform/id-utils";
import {RelationSourceQuery} from "@/model/relation";
import {useRelationsState} from "@/state/relations.state";
import {DEFAULT_RELATION_VIEW_PATH} from "@/platform/global-data";
import {ConnectionsService} from "@/state/connections/connections-service";


interface ConnectionsProviderProps {
    children: React.ReactElement | React.ReactElement[];
}

export default function ConnectionsProvider({children}: ConnectionsProviderProps) {

    const {initialiseDefaultConnections} = useConnectionsState();

    function showExampleQuery(connectionId: string) {
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

    useEffect(() => {
        initialiseDefaultConnections().then(() => {

            // if there are no relations, create an example query
            if (Object.keys(useRelationsState.getState().relations).length === 0) {
                const id = ConnectionsService.getInstance().getDatabaseConnection().id;
                showExampleQuery(id);
            }
        });
    }, []);

    return (
        <>
            {children}
        </>
    );
}

