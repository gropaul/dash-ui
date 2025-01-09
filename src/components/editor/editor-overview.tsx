'use client';

import React, {Fragment} from "react";
import {H5} from "@/components/ui/typography";
import {Separator} from "@/components/ui/separator";
import {useRelationsState} from "@/state/relations.state";
import {RelationView} from "@/components/editor/editor-overview/relation-view";
import {Button} from "@/components/ui/button";
import {Plus} from "lucide-react";

export function EditorOverview() {

    const relations = useRelationsState((state) => state.relations);
    // show a list of the tables, have a light grey background
    return (
        <div className="h-full w-full flex flex-col">
            {/* Header Section */}
            <div className="p-4 pt-3 pb-2 flex flex-row items-center justify-between">
                <H5 className="text-primary text-nowrap">Editor</H5>
                <Button disabled variant={'ghost'} size={'icon'} className={'h-8'}>
                    <Plus size={20}/>
                </Button>
            </div>
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