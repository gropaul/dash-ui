'use client';

import React, {useEffect} from "react";
import {useRelationsState} from "@/state/relations.state";
import {ConnectionsService} from "@/state/connections-service";
import {useDatabaseConState, useDBConHydrationState} from "@/state/connections-database.state";
import {connectionToString, DBConnectionSpec, specToConnection} from "@/state/connections-database/configs";
import {toast} from "sonner";
import {usePathname, useRouter} from 'next/navigation'
import {showExampleQuery} from "@/components/provider/example-query";
import {findWorkingConnection} from "@/components/provider/config-utils";
import {SettingsView} from "@/components/settings/settings-view";
import {decompressString} from "@/lib/string-compression";
import {getDashStateIfExits} from "@/components/import/file-drop-relation/database-import";
import {getImportQuery} from "@/state/connections-database/duckdb-wasm/utils";


interface ConnectionsProviderProps {
    children: React.ReactElement | React.ReactElement[];
}


export default function ConnectionsProvider({children}: ConnectionsProviderProps) {

    const {setDatabaseConnection, history} = useDatabaseConState();
    const hydrated = useDBConHydrationState(state => state.hydrated);
    const [connectionSettingsOpen, connectionsConfigForcedOpen, setConnectionSettingsOpen, setConnectionsForcedOpen] = useDatabaseConState(state => [
        state.connectionsConfigOpen,
        state.connectionsConfigForcedOpen,
        state.setConnectionsConfigOpen, state.setConnectionsConfigForcedOpen
    ]);
    const router = useRouter()
    const pathname = usePathname()

    const onSaveSpec = async (spec: DBConnectionSpec) => {
        const connection = specToConnection(spec);
        await connection.initialise();
        const status = await connection.checkConnectionState();
        if (status.state === 'connected') {
            await setDatabaseConnection(connection);
            setConnectionsForcedOpen(false);
        } else {
            toast.error('Failed to connect to database');
        }

    }
    async function initializeConnections() {
        // get the current url params to configure the connection
        const urlParams = new URLSearchParams(window.location.search);
        let connection = await findWorkingConnection(urlParams, history);

        // if there is a parameter k, it is a token for the connection. We have to remove
        // it from the url params to avoid being displayed all the time
        if (urlParams.has('k')) {
            urlParams.delete('k');
            const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
            router.replace(newUrl);
         }

        if (!connection) {
            toast.error('No viable connection found');
            setConnectionsForcedOpen(true);
            return;
        }

        await setDatabaseConnection(connection);

        // if the url params have an attach value, load the value and parse it
        if (urlParams.has('attach')) {
            const attach = urlParams.get('attach');
            if (attach) {

                const decodedDatabaseUrl = decompressString(attach);
                const fileName = decodedDatabaseUrl.split('/').pop() || 'database.duckdb';
                console.log('Attach file', fileName, decodedDatabaseUrl);
                // remove the file extension from the file name (database.duckdb -> database)
                const fileNameWithoutExtension = fileName.split('.').slice(0, -1).join('.');
                const query = await getImportQuery( decodedDatabaseUrl, fileNameWithoutExtension,'database', true);
                await ConnectionsService.getInstance().getDatabaseConnection().executeQuery(query);
                console.log('Attach query executed');
                const dashState = await getDashStateIfExits(connection, fileNameWithoutExtension);
                if (dashState) {
                    useRelationsState.getState().mergeState(dashState, true);
                }
            }
        }

        // show toast message that connection is initialised
        const isDebug = process.env.NODE_ENV === 'development';
        const text = connectionToString(connection, isDebug);
        toast.success(text);

        // wait 1000ms before showing the example query
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (Object.keys(useRelationsState.getState().relations).length === 0) {
            const id = ConnectionsService.getInstance().getDatabaseConnection().id;
            showExampleQuery(id);
        }
    }

    useEffect(() => {
        if (hydrated) {
            initializeConnections();
        }
    }, [hydrated]);


    return (
        <>
            {children}
            <SettingsView
                open={connectionSettingsOpen}
                forceOpen={connectionsConfigForcedOpen}
                onOpenChange={setConnectionSettingsOpen}
                onSpecSave={onSaveSpec}
                initialTab="connection"
            />
        </>
    );
}
