"use client"

import React from "react";
import {Separator} from "@/components/ui/separator";
import {ConfigSection} from "@/components/relation/common/config-section";
import {RelationConfigTabProps} from "@/components/relation/config/relation-config-tab";
import {ReferenceEntry, useRelationReferences} from "@/components/relation/config/use-relation-references";
import {ReferenceList} from "@/components/relation/config/reference-list";

/**
 * Everything that connects this query to the rest of the project: the two directions of the
 * `refs.<name>()` graph, plus the pages that use it. Only the groups that have entries are rendered;
 * the tab shows only for a query with at least one (relation-config-tabs.ts).
 */
export function ReferencesTab(props: RelationConfigTabProps) {
    const references = useRelationReferences(props.relationState);

    const groups: { title: string; entries: ReferenceEntry[] }[] = [
        // relations only; the dashboard/canvas groups below cover the other kinds of use
        {title: 'Used by', entries: references.usedByRelations},
        {title: 'Uses', entries: references.usesRelations},
        {title: 'Pages', entries: references.pages},
    ].filter(group => group.entries.length > 0);

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
