'use client';

import {useEffect} from "react";
import {DataConnection, DataSource, useConnectionsState} from "@/state/connections.state";
import {getDuckDBLocalConnection} from "@/state/connections/duckdb-over-http";


interface ConnectionsProviderProps {
    children: React.ReactElement | React.ReactElement[];
}

export default function ConnectionsProvider({children}: ConnectionsProviderProps) {

    const { addConnection, updateDataSources, getConnection } = useConnectionsState();

    useEffect(() => {
        const duckDBLocal: DataConnection = getDuckDBLocalConnection();
        const id = duckDBLocal.id;
        console.log("Before addConnection", duckDBLocal);
        addConnection(duckDBLocal);

        console.log("After addConnection", getConnection(id));
        updateDataSources(duckDBLocal.id).then((dataSources: DataSource[]) => {
            console.log("After updateDataSources", getConnection(id));
        });

    }, [addConnection]);

    return (
        <div>
            {children}
        </div>
    );
}