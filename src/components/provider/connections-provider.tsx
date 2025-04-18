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
import {ConnectionViewDialog} from "@/components/connections/connection-view-dialog";


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
        // stay at the same page but remove the params from the url
        router.replace(pathname, undefined);

        if (!connection) {
            toast.error('No viable connection found');
            setConnectionsForcedOpen(true);
            return;
        }

        // clear all params from the url by navigating to the base url using next.js router
        await setDatabaseConnection(connection);

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
            <ConnectionViewDialog
                open={connectionSettingsOpen}
                forceOpen={connectionsConfigForcedOpen}
                onOpenChange={setConnectionSettingsOpen}
                onSpecSave={onSaveSpec}
            />
        </>
    );
}

