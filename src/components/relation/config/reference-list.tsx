"use client"

import React from "react";
import {ChevronRight} from "lucide-react";
import {cn} from "@/lib/utils";
import {defaultIconFactory} from "@/components/basics/files/icon-factories";
import {DashNavigator} from "@/state/routing/navigation";
import {ReferenceEntry} from "@/components/relation/config/use-relation-references";

interface ReferenceListProps {
    entries: ReferenceEntry[];
}

/** The body of one References section: a row per referencing object. Empty groups aren't rendered. */
export function ReferenceList({entries}: ReferenceListProps) {
    return (
        <div className="flex flex-col gap-1.5">
            {entries.map(entry => <ReferenceRow key={entry.id} entry={entry}/>)}
        </div>
    );
}

function ReferenceRow({entry}: { entry: ReferenceEntry }) {
    function onClick() {
        if (!entry.navigable) return;
        DashNavigator.instance().navigateToObjectId(entry.id);
    }

    return (
        <button
            disabled={!entry.navigable}
            onClick={onClick}
            className={cn(
                "group flex items-center gap-2 rounded-md border bg-card px-2 py-1 text-left",
                entry.navigable ? "hover:bg-muted" : "cursor-default",
            )}
        >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">
                {defaultIconFactory(entry.iconType)}
            </span>
            <span className={cn(
                "min-w-0 flex-1 truncate text-xs",
                entry.navigable ? "text-foreground" : "text-muted-foreground",
            )}>
                {entry.name}
            </span>
            {entry.detail && (
                <span className="shrink-0 text-[10px] text-muted-foreground">{entry.detail}</span>
            )}
            {entry.navigable && (
                <ChevronRight size={13} className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100"/>
            )}
        </button>
    );
}
