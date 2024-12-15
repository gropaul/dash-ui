'use client';

import React from "react";
import {useConnectionsState} from "@/state/connections.state";
import {ConnectionView} from "@/components/connections/connection-view";

export function ConnectionsOverview() {

    const connections = useConnectionsState((state) => state.connections);

    // show a list of the tables, have a light grey background
    return (
        <div className=" h-full w-full">
            <div
                className="flex items-center dark:border-gray-700 dark:text-white px-2"
                style={{height: '28px'}}>
                    <div className={'font-semibold'}>
                        Connections
                    </div>

            </div>
            <div className="border-t  dark:border-gray-700 overflow-y-auto h-fit">
                <ul>
                    {Object.values(connections).map((connection, index) => {
                        return <ConnectionView connection={connection} key={index}/>;
                    })}
                </ul>
                <div className={'h-16'}/>
            </div>
        </div>

    )
}