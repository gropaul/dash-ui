'use client';

import React from "react";
import {useRelationsState} from "@/state/relations.state";
import {crumbsForSegments, findNodeByMacroPath, parseRoute, SPACES_ROOT} from "@/state/routing/core-model";
import {onNavClick, useCurrentPath} from "@/state/routing/use-location";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/**
 * The workspace folder ancestry of the currently-routed node, rendered with the
 * shadcn Breadcrumb primitives as clickable links ending with a trailing
 * separator: `Workspace / Finance /`. The bold current-node name is rendered by
 * the header next to this prefix.
 *
 * Renders only when the given entity IS the node addressed by the current URL
 * (i.e. the main workspace view), so embedded relations (canvas nodes, dashboard
 * widgets) don't show it. Returns null otherwise.
 */
export function WorkspacePathPrefix({entityId}: { entityId: string }) {
    const pathname = useCurrentPath();
    const editorElements = useRelationsState((state) => state.editorElements);

    const {view, params} = parseRoute(pathname);
    if (view !== "spaces") return null;

    const current = findNodeByMacroPath(editorElements, params.segments);
    if (!current || current.id !== entityId) return null;

    // Drop the last crumb (the entity itself — shown by the title next to us).
    const ancestors = crumbsForSegments(editorElements, params.segments).slice(0, -1);

    return (
        <Breadcrumb className="min-w-0 flex-shrink">
            <BreadcrumbList className="flex-nowrap gap-1">
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                        <a href={SPACES_ROOT} onClick={onNavClick(SPACES_ROOT)}>Workspace</a>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                {ancestors.map((crumb) => (
                    <React.Fragment key={crumb.to}>
                        <BreadcrumbSeparator>/</BreadcrumbSeparator>
                        <BreadcrumbItem className="min-w-0">
                            <BreadcrumbLink asChild className="truncate max-w-[160px]">
                                <a href={crumb.to} onClick={onNavClick(crumb.to)}>{crumb.label}</a>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                    </React.Fragment>
                ))}
                <BreadcrumbSeparator>/</BreadcrumbSeparator>
            </BreadcrumbList>
        </Breadcrumb>
    );
}
