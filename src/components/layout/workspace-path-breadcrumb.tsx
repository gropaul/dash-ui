'use client';

import React from "react";
import {ArrowUpRight} from "lucide-react";
import {TreeNode} from "@/components/basics/files/tree-utils";
import {useRelationsState} from "@/state/relations.state";
import {Crumb, crumbsForSegments, macroPathForId, parseRoute, routeForSegments, SPACES_ROOT} from "@/state/routing/core-model";
import {buildRoutableTree} from "@/state/routing/routable-tree";
import {onNavClick, useCurrentPath} from "@/state/routing/use-location";
import {navigate} from "@/state/routing/navigation";
import {
    Breadcrumb,
    BreadcrumbEllipsis,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";

// Above this many crumbs the middle collapses into an expandable ellipsis
// (first + … + last two), keeping the bar on a single line.
const MAX_VISIBLE = 4;

/**
 * The workspace path to the currently-routed node, rendered as a shadcn Breadcrumb.
 * URL-derived: `useCurrentPath()` + the editor tree resolve the trail via
 * `crumbsForSegments`. Dashboards/canvases expose their relations as virtual children
 * (see routable-tree), so a relation opened from one shows as `…/Dashboard/Relation` —
 * an alias, flagged with a trailing link to its real location. Reactive to renames via
 * the `editorElements` subscription.
 */
export function WorkspacePathBreadcrumb() {
    const pathname = useCurrentPath();
    const editorElements = useRelationsState((s) => s.editorElements);

    const {view, params} = parseRoute(pathname);
    const root: Crumb = {id: "__root__", label: "Workspace", to: SPACES_ROOT, type: "folder"};

    // Augmented tree (getState is fine — re-render is driven by editorElements + pathname).
    const st = useRelationsState.getState();
    const tree = view === "spaces"
        ? buildRoutableTree(editorElements, st.relations, st.dashboards, st.canvas)
        : editorElements;
    // Non-spaces routes (root / notfound) still show the Workspace link to click back.
    const trail: Crumb[] = view === "spaces" ? [root, ...crumbsForSegments(tree, params.segments)] : [root];

    // Only a leaf under a dashboard/canvas is an alias (relations have no children). Resolve the
    // relation's canonical location in the raw tree: both its URL and a human-readable path for
    // the tooltip.
    const last = trail[trail.length - 1];
    const prev = trail[trail.length - 2];
    const alias = resolveAlias(editorElements, last, prev);

    return (
        <Breadcrumb className="min-w-0">
            <BreadcrumbList className="flex-nowrap">
                {buildEntries(trail).map((entry, i) => (
                    <React.Fragment key={entry.kind === "ellipsis" ? "ellipsis" : entry.crumb.to}>
                        {i > 0 && <BreadcrumbSeparator/>}
                        {entry.kind === "ellipsis"
                            ? renderEllipsis(entry.hidden)
                            : renderCrumb(entry.crumb, entry.isLast, entry.isLast ? alias : undefined)}
                    </React.Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}

interface AliasInfo {
    to: string;      // canonical /workspace/... URL of the original
    label: string;   // human-readable path, e.g. "Workspace / Finance / Q4 Revenue"
}

function resolveAlias(editorElements: TreeNode[], last: Crumb, prev?: Crumb): AliasInfo | undefined {
    if (!prev || (prev.type !== "dashboards" && prev.type !== "canvas")) return undefined;
    const segments = macroPathForId(editorElements, last.id);
    if (!segments) return undefined;
    return {
        to: routeForSegments(segments),
        label: ["Workspace", ...crumbsForSegments(editorElements, segments).map((c) => c.label)].join(" / "),
    };
}

type Entry =
    | {kind: "crumb"; crumb: Crumb; isLast: boolean}
    | {kind: "ellipsis"; hidden: Crumb[]};

function buildEntries(trail: Crumb[]): Entry[] {
    if (trail.length <= MAX_VISIBLE) {
        return trail.map((crumb, i) => ({kind: "crumb", crumb, isLast: i === trail.length - 1}));
    }
    const lastTwo = trail.slice(-2);
    return [
        {kind: "crumb", crumb: trail[0], isLast: false},
        {kind: "ellipsis", hidden: trail.slice(1, trail.length - 2)},
        ...lastTwo.map((crumb, i): Entry => ({kind: "crumb", crumb, isLast: i === lastTwo.length - 1})),
    ];
}

function renderCrumb(crumb: Crumb, isLast: boolean, alias?: AliasInfo) {
    return (
        <BreadcrumbItem className="min-w-0">
            {isLast ? (
                <BreadcrumbPage className="truncate max-w-[160px]">{crumb.label}</BreadcrumbPage>
            ) : (
                <BreadcrumbLink
                    href={crumb.to}
                    onClick={onNavClick(crumb.to)}
                    className="truncate max-w-[160px]"
                >
                    {crumb.label}
                </BreadcrumbLink>
            )}
            {alias && (
                <TooltipProvider delayDuration={300}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <a
                                href={alias.to}
                                onClick={onNavClick(alias.to)}
                                aria-label="Open the original"
                                className="inline-flex text-muted-foreground hover:text-foreground"
                            >
                                <ArrowUpRight className="h-3.5 w-3.5"/>
                            </a>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-80">
                            <div className="font-medium">Link — opens the original</div>
                            <div className="mt-0.5 text-primary-foreground/70 break-words">{alias.label}</div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </BreadcrumbItem>
    );
}

function renderEllipsis(hidden: Crumb[]) {
    return (
        <BreadcrumbItem>
            <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center" aria-label="Show hidden path segments">
                    <BreadcrumbEllipsis/>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    {hidden.map((crumb) => (
                        <DropdownMenuItem key={crumb.to} onClick={() => navigate(crumb.to)}>
                            <span className="truncate">{crumb.label}</span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </BreadcrumbItem>
    );
}
