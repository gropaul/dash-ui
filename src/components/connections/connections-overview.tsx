'use client';

import {useRelationsState} from "@/state/relations.state";
import React from "react";
import {DataConnection, useConnectionsState} from "@/state/connections.state";
import {TreeExplorer} from "@/components/basics/tree-explorer/tree-explorer";
import {defaultIconFactory} from "@/components/basics/tree-explorer/icon-factories";
import {ConnectionView} from "@/components/connections/connection-view";

export function ConnectionsOverview() {

    const connections = useConnectionsState((state) => state.connections);


    // show a list of the tables, have a light grey background
    return (
        <div className="bg-gray-50 h-full w-full">
            <div style={{height: 32}} className=" uppercase flex items-center p-2 border-gray-200 font-bold">
                Connections
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 overflow-y-auto h-fit">
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