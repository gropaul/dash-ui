'use client';

import React, {Fragment} from "react";
import {useConnectionsState} from "@/state/connections.state";
import {ConnectionView} from "@/components/connections/connection-view";
import {H5} from "@/components/ui/typography";
import {Separator} from "@/components/ui/separator";
import {ScrollArea} from "@/components/ui/scroll-area";
export function ConnectionsOverview() {
    const connections = useConnectionsState((state) => state.connections);

    return (
        <div className="h-full w-full flex flex-col">
            {/* Header Section */}
            <div
                className="pl-2 flex items-center"
                style={{ height: '40px' }}
            >
                <H5 className="text-primary text-nowrap">Connections</H5>
            </div>
            <Separator />

            {/* Scrollable Section */}
            <div className="flex-1 overflow-y-auto">
                <ul>
                    {Object.values(connections).map((connection, index) => {
                        return <Fragment key={index}>
                            <ConnectionView connection={connection} key={index}/>
                        </Fragment>;
                    })}
                </ul>
            </div>
        </div>
    );
}
