'use client';

import React from "react";
import {useConnectionsState} from "@/state/connections.state";
import {ConnectionView} from "@/components/connections/connection-view";
import {H5} from "@/components/ui/typography";
import {Separator} from "@/components/ui/separator";
import {useRelationsState} from "@/state/relations.state";

export function ConnectionsOverview() {

    const connections = useConnectionsState((state) => state.connections);
    const relations = useRelationsState((state) => state.relations);
    // show a list of the tables, have a light grey background
    return (
        <div className=" h-full w-full bg-background">
            <div className={'pl-2'}
                style={{height: '28px'}}>
                    <H5 className={'text-primary'}>Connections</H5>
            </div>
            <div className="overflow-y-auto h-fit bg-background">
                <ul>
                    {Object.values(connections).map((connection, index) => {
                        return <>
                            <Separator key={`sep-${index}`}/>
                            <ConnectionView connection={connection} key={index}/>
                        </>;
                    })}
                </ul>
            </div>
        </div>

    )
}