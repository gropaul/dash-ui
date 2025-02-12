'use client';

import {useEffect} from "react";
import {getRandomId} from "@/platform/id-utils";
import {RelationSourceQuery} from "@/model/relation";
import {useRelationsState} from "@/state/relations.state";
import {DEFAULT_RELATION_VIEW_PATH} from "@/platform/global-data";
import {ConnectionsService} from "@/state/connections-service";
import {useDatabaseConState} from "@/state/connections-database.state";
import {DBConnectionSpec, specToString} from "@/state/connections-database/configs";
import {DuckDBOverHttpConfig} from "@/state/connections-database/duckdb-over-http";
import {toast} from "sonner";
import {useRouter} from 'next/navigation'


interface ConnectionsProviderProps {
    children: React.ReactElement | React.ReactElement[];
}

function XorDecrypt(key: string, data: string) {
    let result = '';
    for (let i = 0; i < data.length; i++) {
        result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
}


export function parseConnectionParams(urlParams: URLSearchParams): DBConnectionSpec | undefined {
    // first get the "api" parameter
    if (!urlParams.has('api')) {
        console.error('No API parameter found');
        return undefined;
    }

    const api = urlParams.get('api');
    console.log('API:', api);

    switch (api) {
        case 'http':
            // get the "path" parameter
            const url = urlParams.get('url');

            if (!url) {
                console.error('No URL parameter found, but required for HTTP API');
                return undefined;
            }

            // optional: k for api key
            let key = undefined;
            let authentication: 'none' | 'token' = 'none';
            const enc_ey = urlParams.get('k');
            if (enc_ey) {
                key = XorDecrypt('DuckDB', enc_ey);
                authentication = 'token';
            }

            const httpconfig: DuckDBOverHttpConfig = {
                name: 'DuckDB',
                url: url,
                authentication: authentication,
                token: key
            }

            return {
                type: 'duckdb-over-http',
                config: httpconfig
            }

        default:
            console.error('Unknown API:', api);
            return undefined;
    }


}

export default function ConnectionsProvider({children}: ConnectionsProviderProps) {

    const {initialiseDBConnection} = useDatabaseConState();
    const router = useRouter()

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
        // get the current url params to configure the connection
        const urlParams = new URLSearchParams(window.location.search);
        const connectionSpec = parseConnectionParams(urlParams);

        console.log('Connection spec:', connectionSpec);

        if (!connectionSpec) {
            toast.error('No connection spec found');
        } else {
            console.log('Connection spec:', connectionSpec);
            // clear all params from the url by navigating to the base url using next.js router
            router.push('/');
            initialiseDBConnection(connectionSpec).then(() => {
                // show toast message that connection is initialised
                const isDebug = process.env.NODE_ENV === 'development';
                const text = specToString(connectionSpec, isDebug);
                toast.success(text);

                // wait a second for rest of the app to initialise
                setTimeout(() => {
                    // if there are no relations, create an example query
                    if (Object.keys(useRelationsState.getState().relations).length === 0) {
                        const id = ConnectionsService.getInstance().getDatabaseConnection().id;
                        showExampleQuery(id);
                    }
                }, 1000);
            });
        }
    }, []);

    return (
        <>
            {children}
        </>
    );
}

