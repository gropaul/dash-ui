'use client';

import {useEffect} from "react";
import {useConnectionsState} from "@/state/connections.state";


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