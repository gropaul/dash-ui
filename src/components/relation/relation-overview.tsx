'use client';

import React, {Fragment} from "react";
import {H5} from "@/components/ui/typography";
import {Separator} from "@/components/ui/separator";
import {useRelationsState} from "@/state/relations.state";
import {RelationView} from "@/components/relation/relation-overview/relation-view";

export function RelationsOverview() {

    const relations = useRelationsState((state) => state.relations);
    // show a list of the tables, have a light grey background
    return (
        <div className="h-full w-full flex flex-col">
            <div
                className={'pl-2 flex items-center'}
                style={{height: '40px'}}
            >
                <H5 className={'text-primary text-nowrap'}>Relations</H5>

            </div>
            <Separator/>
            <div className="overflow-y-auto h-fit">
                <ul>
                    {Object.values(relations).map((relation, index) => {
                        return <Fragment key={index}>
                            <RelationView relation={relation} key={index}/>
                        </Fragment>;
                    })}
                </ul>
            </div>
        </div>

    )
}