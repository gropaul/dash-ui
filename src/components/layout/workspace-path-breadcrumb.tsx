'use client';

import React from "react";
import {ArrowUpRight} from "lucide-react";
import {TreeNode} from "@/components/basics/files/tree-utils";
import {useRelationsState} from "@/state/relations.state";
import {crumbsForSegments, objectSlugPathForId} from "@/state/routing/core-model";
import {buildRoutableTree} from "@/state/routing/routable-tree";
import {useDashLocation} from "@/state/routing/use-dash-location";
import {DashLocations, DashNavigator} from "@/state/routing/navigation";
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
import {useProjectsState} from "@/state/projects.state";

// Above this many crumbs the middle collapses into an expandable ellipsis
// (first + … + last two), keeping the bar on a single line.
const MAX_VISIBLE = 4;

/**
 * The path to the currently-routed node, rendered as a shadcn Breadcrumb. Handles both
 * top-level views:
 *  - `/projects/<slug>/...` — URL-derived from the editor tree via `crumbsForSegments`.
 *    Dashboards/canvases expose their relations as virtual children (see routable-tree),
 *    so a relation opened from one shows as `…/Dashboard/Relation` — an alias, flagged
 *    with a trailing link to its real location. Reactive to renames via `editorElements`.
 *  - `/data/...` — the catalog; a literal `Data / db / schema / table [/ column]` trail
 *    built straight from the URL segments (see `dataTrail`).
 */
/** When false, the workspace root crumb is omitted (the ProjectSwitcher serves as the root). */
export function WorkspacePathBreadcrumb({showWorkspaceRoot = true}: {showWorkspaceRoot?: boolean} = {}) {
    const location = useDashLocation();
    const editorElements = useRelationsState((s) => s.editorElements);
    const project = useProjectsState((s) => s.getCurrentProject());
    const nav = DashNavigator.instance();

    let trail: BreadCrumb[];
    if (location.basePath === "data") {
        // Data is project-independent, so it keeps its own "Data" root regardless of showWorkspaceRoot.
        trail = dataTrail(location.segments);
    } else if (location.basePath === "object") {
        // Augmented tree (getState is fine — re-render is driven by editorElements + location).
        const st = useRelationsState.getState();
        const tree = buildRoutableTree(editorElements, st.relations, st.dashboards, st.canvas);
        const toUrl = (segments: string[]) => nav.getUrlFromLocation(DashLocations.CurrentProjectElement(segments));
        const crumbs = crumbsForSegments(tree, location.path).map((c): BreadCrumb => ({
            id: c.id, label: c.label, to: toUrl(c.segments), type: c.type,
        }));
        const projectRoot: BreadCrumb = {id: "__root__", label: project.name, to: toUrl([]), type: "folder"};
        trail = showWorkspaceRoot ? [projectRoot, ...crumbs] : crumbs;
    } else {
        // Project list: the switcher is enough; nothing to show here.
        trail = [];
    }

    // With the root hidden, a leading separator visually joins the switcher to the first crumb.
    const leadingSeparator = !showWorkspaceRoot && trail.length > 0;

    // Only a leaf under a dashboard/canvas is an alias (relations have no children). Resolve the
    // relation's canonical location in the raw tree: both its URL and a human-readable path for
    // the tooltip.
    const last = trail[trail.length - 1];
    const prev = trail[trail.length - 2];
    const alias = resolveAlias(editorElements, project.name, last, prev);

    return (
        <Breadcrumb className="min-w-0">
            <BreadcrumbList className="flex-nowrap gap-2 sm:gap-2">
                {buildEntries(trail).map((entry, i) => (
                    <React.Fragment key={entry.kind === "ellipsis" ? "ellipsis" : entry.crumb.id}>
                        {(i > 0 || leadingSeparator) && <BreadcrumbSeparator className="-mx-1 text-muted-foreground">/</BreadcrumbSeparator>}
                        {entry.kind === "ellipsis"
                            ? renderEllipsis(entry.hidden)
                            : renderCrumb(entry.crumb, entry.isLast, entry.isLast ? alias : undefined)}
                    </React.Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}

/** A rendered breadcrumb: a label plus (optionally) the URL it links to. */
interface BreadCrumb {
    id: string;
    label: string;
    to?: string;
    type: string;
}

interface AliasInfo {
    to: string;      // canonical /projects/... URL of the original
    label: string;   // human-readable path, e.g. "Finance/Q4 Revenue"
}

function resolveAlias(editorElements: TreeNode[], projectName: string, last: BreadCrumb, prev?: BreadCrumb): AliasInfo | undefined {
    if (!prev || (prev.type !== "dashboards" && prev.type !== "canvas")) return undefined;
    const segments = objectSlugPathForId(editorElements, last.id);
    if (!segments) return undefined;
    const nav = DashNavigator.instance();
    return {
        to: nav.getUrlFromLocation(DashLocations.CurrentProjectElement(segments)),
        label: [projectName, ...crumbsForSegments(editorElements, segments).map((c) => c.label)].join("/"),
    };
}

/**
 * The `Data / db / schema / table [/ column]` trail for a `/data/...` route. Unlike the
 * workspace tree, these are literal URL segments, and every prefix is a real, linkable
 * location: a database/schema prefix filters the catalog list, a table/column prefix opens
 * the detail (see catalog-model routing). So every crumb carries a `to`.
 */
function dataTrail(segments: string[]): BreadCrumb[] {
    const nav = DashNavigator.instance();
    const root: BreadCrumb = {id: "__data_root__", label: "Data", to: nav.getUrlFromLocation(DashLocations.DataRoot()), type: "folder"};
    const crumbs = segments.map((seg, i): BreadCrumb => ({
        id: `data:${i}:${seg}`,
        label: seg,
        to: nav.getUrlFromLocation(DashLocations.DataElement(segments.slice(0, i + 1))),
        type: "data",
    }));
    return [root, ...crumbs];
}

type Entry =
    | {kind: "crumb"; crumb: BreadCrumb; isLast: boolean}
    | {kind: "ellipsis"; hidden: BreadCrumb[]};

function buildEntries(trail: BreadCrumb[]): Entry[] {
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

function renderCrumb(crumb: BreadCrumb, isLast: boolean, alias?: AliasInfo) {
    // A crumb links only when it has its own page (`to`) and isn't the current leaf. Structural
    // crumbs without a page (e.g. a `/data` database/schema) show as muted context labels.
    const navigable = !isLast && !!crumb.to;
    return (
        <BreadcrumbItem className="min-w-0">
            {navigable ? (
                <BreadcrumbLink
                    onClick={DashNavigator.instance().onClickNavigateToObjectId(crumb.id)}
                    // Match the project button's ghost hover.
                    className="truncate max-w-[160px] rounded-2xl px-1.5 py-1 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                    {crumb.label}
                </BreadcrumbLink>
            ) : (
                <BreadcrumbPage className={`truncate max-w-[160px] px-1.5 py-1   hover:bg-accent rounded-2xl ${isLast ? "" : "text-muted-foreground"}`}>
                    {crumb.label}
                </BreadcrumbPage>
            )}
            {alias && (
                <TooltipProvider delayDuration={300}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <a
                                onClick={DashNavigator.instance().onClickNavigateToObjectId(crumb.id)}
                                aria-label="Open the original"
                                className="inline-flex text-muted-foreground hover:text-foreground"
                            >
                                <ArrowUpRight className="h-3.5 w-3.5"/>
                            </a>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-80">
                            <div className="font-medium">This is a linked view. Any changes you make here also apply to the original at </div>
                            <div className="mt-0.5 font-medium font-mono">{alias.label}</div>
                            <div className="mt-0.5 text-primary-foreground/70 break-words">Click here to there</div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </BreadcrumbItem>
    );
}

function renderEllipsis(hidden: BreadCrumb[]) {
    const nav = DashNavigator.instance();
    return (
        <BreadcrumbItem>
            <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center" aria-label="Show hidden path segments">
                    <BreadcrumbEllipsis/>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    {hidden.map((crumb) => (
                        <DropdownMenuItem
                            key={crumb.id}
                            disabled={!crumb.to}
                            onClick={crumb.to ? () => nav.navigateToLocation(nav.getLocationFromUrl(crumb.to!)) : undefined}
                        >
                            <span className="truncate">{crumb.label}</span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </BreadcrumbItem>
    );
}
