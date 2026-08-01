"use client"

import React from "react";
import {Separator} from "@/components/ui/separator";
import {Muted} from "@/components/ui/typography";
import {ConfigSection} from "@/components/relation/common/config-section";
import {RelationConfigTabProps} from "@/components/relation/config/relation-config-tab";
import {ReferenceEntry, useRelationReferences} from "@/components/relation/config/use-relation-references";
import {ReferenceList} from "@/components/relation/config/reference-list";

/**
 * Everything that connects this relation to the rest of the project: the two directions of the
 * `refs.<name>()` macro graph, plus the dashboards and canvases that place it. Only the groups
 * that actually have entries are rendered, so an unconnected relation shows one empty state
 * instead of four.
 */
export function ReferencesTab(props: RelationConfigTabProps) {
    const references = useRelationReferences(props.relationState);

    const groups: { title: string; entries: ReferenceEntry[] }[] = [
        // relations only; the dashboard/canvas groups below cover the other kinds of use
        {title: 'Used by', entries: references.usedByRelations},
        {title: 'Uses', entries: references.usesRelations},
        {title: 'Dashboards', entries: references.dashboards},
        {title: 'Canvases', entries: references.canvases},
    ].filter(group => group.entries.length > 0);

    if (groups.length === 0) {
        return (
            <Muted className="text-sm">
                Nothing references this relation yet. Other relations can read it
                with <span className="font-mono">refs.&lt;name&gt;()</span>, and it can be placed on
                a dashboard or a canvas.
            </Muted>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {groups.map((group, index) => (
                <React.Fragment key={group.title}>
                    {index > 0 && <Separator/>}
                    <ConfigSection title={group.title} collapsedSummary={`${group.entries.length}`}>
                        <ReferenceList entries={group.entries}/>
                    </ConfigSection>
                </React.Fragment>
            ))}
            <div className="h-8"/>
        </div>
    );
}
