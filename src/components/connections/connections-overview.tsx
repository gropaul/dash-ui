'use client';

import React from "react";
import {useConnectionsState} from "@/state/connections.state";
import {ConnectionView} from "@/components/connections/connection-view";
import {H5} from "@/components/ui/typography";
import {Divide} from "lucide-react";
import {Separator} from "@/components/ui/separator";

export function ConnectionsOverview() {

    const connections = useConnectionsState((state) => state.connections);

    // show a list of the tables, have a light grey background
    return (
        <div className=" h-full w-full bg-background">
            <div
                style={{height: '28px'}}>
                    <H5 className={'text-primary'}>Connections</H5>

            </div>
            <div className="overflow-y-auto h-fit bg-background">
                <ul>
                    {Object.values(connections).map((connection, index) => {
                        return <>
                            <Separator/>
                            <ConnectionView connection={connection} key={index}/>
                        </>;
                    })}
                </ul>
            </div>
        </div>

    )
}