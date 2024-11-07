'use client';

import {useEffect} from "react";
import {DataConnection, useConnectionsState} from "@/state/connections.state";
import {getDuckDBLocalConnection} from "@/state/connections/duckdb-over-http";
import {getDuckDBWasmConnection} from "@/state/connections/duckdb-wasm";


interface ConnectionsProviderProps {
    children: React.ReactElement | React.ReactElement[];
}

export default function ConnectionsProvider({children}: ConnectionsProviderProps) {

    const {initialiseDefaultConnections} = useConnectionsState();

    useEffect(() => {
        initialiseDefaultConnections();
    }, []);

    return (
        <div>
            {children}
        </div>
    );
}