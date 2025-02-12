'use client';

import React, {Fragment} from "react";
import {useSourceConState} from "@/state/connections-source.state";
import {ConnectionView} from "@/components/connections/connection-view";
import {H5} from "@/components/ui/typography";
import {Button} from "@/components/ui/button";
import {Plus} from "lucide-react";

export function ConnectionsOverviewTab() {
    const connections = useSourceConState((state) => state.connections);

    return (
        <div className="h-full w-full flex flex-col">
            {/* Header Section */}
            <div className="pl-4 pt-3 pr-3 pb-2 flex flex-row items-center justify-between">
                <H5 className="text-primary text-nowrap">Data Sources</H5>
                <Button disabled variant={'ghost'} size={'icon'} className={'h-8 w-8'}>
                    <Plus size={20}/>
                </Button>
            </div>


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
