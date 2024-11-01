'use client';

import {useRelationsState} from "@/state/relations.state";
import React from "react";
import {DataConnection, useConnectionsState} from "@/state/connections.state";
import {TreeExplorer} from "@/components/basics/tree-explorer/tree-explorer";
import {defaultIconFactory} from "@/components/basics/tree-explorer/icon-factories";

export function ConnectionsOverview() {

    const connections = useConnectionsState((state) => state.connections);
    const executeQuery = useConnectionsState((state) => state.executeQuery);
    const addRelation = useRelationsState((state) => state.addRelation);

    function onElementClick(connection: DataConnection, id_path: string[]) {
        // if path has two elements, it’s a data source
        if (id_path.length === 2) {
            const [database, relation] = id_path;
            const query = `SELECT *
                           FROM ${database}.${relation} LIMIT 100`;
            console.log(connection);
            executeQuery(connection.id, query).then((result) => {
                addRelation({
                    name: `${database}.${relation}`,
                    columns: result.columns,
                    rows: result.rows,

                });
            });
        }
    }

    // show a list of the tables, have a light grey background
    return (
        <div className="bg-gray-50 h-full">
            <div style={{height: 32}} className=" uppercase flex items-center p-2 border-gray-200 font-bold">
                Connections
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 overflow-y-auto h-fit max-h-full">
                <ul>
                    {Object.values(connections).map((connection, index) => {
                        return <li
                            key={index}
                            className="p-2 text-s border-b border-gray-200 dark:border-gray-700"
                        >
                            {connection.name}
                            <TreeExplorer
                                tree={connection.dataSources}
                                iconFactory={defaultIconFactory}
                                onClick={(id_path) => onElementClick(connection, id_path)}
                            />
                        </li>
                    })}
                </ul>
            </div>
        </div>

    )
}