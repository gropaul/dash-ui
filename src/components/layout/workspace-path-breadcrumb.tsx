'use client';

import React from "react";
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
import {useProjectsState, useRoutedProject} from "@/state/projects.state";
import {useGUIState} from "@/state/gui.state";
import {ancestorsOf} from "@/state/workspace/paths";
import {displayName} from "@/state/workspace/workspace-tree";

// Above this many crumbs the middle collapses into an expandable ellipsis
// (first + … + last two), keeping the bar on a single line.
const MAX_VISIBLE = 4;

/**
 * The path to the currently-routed view, rendered as a shadcn Breadcrumb. Handles the project sections:
 *  - `/projects/<id>/workspace/<path>`: the open file's path. A folder segment opens that folder in the file
 *    tree, since folders have no view of their own.
 *  - `/projects/<id>/data/...`: the catalog; a literal `Catalog / db / schema / table [/ column]` trail built
 *    straight from the URL segments (see `dataTrail`).
 */
/** There is no project-name root crumb: the ProjectSwitcher next to this serves as the root. */
export function WorkspacePathBreadcrumb() {
    const location = useDashLocation();
    const project = useProjectsState((s) => s.getCurrentProject());
    const {isUnknown} = useRoutedProject();
    const nav = DashNavigator.instance();

    // A bogus /project/<id> URL: don't resolve path segments against the (mismatched) loaded
    // project's tree — that would show crumbs for a project the URL isn't actually pointing at.
    if (isUnknown) return null;

    let trail: BreadCrumb[];
    if (location.basePath === "project" && project) {
        if (location.section === "connections") {
            trail = [{
                id: "__connections__", label: "Connections",
                to: nav.getUrlFromLocation(DashLocations.CurrentProjectConnections()), type: "connections",
            }];
        } else if (location.section === "data") {
            trail = dataTrail(location.segments);
        } else {
            trail = workspaceTrail(location.projectId, location.path);
        }
    } else {
        // Project list: the switcher is enough; nothing to show here.
        trail = [];
    }

    // With the root hidden, a leading separator visually joins the switcher to the first crumb.
    const leadingSeparator = trail.length > 0;

    return (
        <Breadcrumb className="min-w-0">
            <BreadcrumbList className="flex-nowrap gap-2 sm:gap-2">
                {buildEntries(trail).map((entry, i) => (
                    <React.Fragment key={entry.kind === "ellipsis" ? "ellipsis" : entry.crumb.id}>
                        {(i > 0 || leadingSeparator) && <BreadcrumbSeparator className="-mx-1 text-muted-foreground">/</BreadcrumbSeparator>}
                        {entry.kind === "ellipsis"
                            ? renderEllipsis(entry.hidden)
                            : renderCrumb(entry.crumb, entry.isLast)}
                    </React.Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}

/** A rendered breadcrumb: a label plus (optionally) the URL it links to or what a click does. */
interface BreadCrumb {
    id: string;
    label: string;
    to?: string;
    onClick?: () => void;
    type: string;
}

/** The open file's folders, each opening in the file tree on a click, and the file's name. */
function workspaceTrail(projectId: string, segments: string[]): BreadCrumb[] {
    const path = segments.join('/');
    const openFolder = (dir: string) => () => {
        const setOpen = useGUIState.getState().setWorkspaceFolderOpen;
        [...ancestorsOf(dir), dir].forEach(d => setOpen(projectId, d, true));
    };
    const folders = ancestorsOf(path).map((dir, i): BreadCrumb => ({
        id: `dir:${dir}`, label: segments[i], onClick: openFolder(dir), type: "folder",
    }));
    return [...folders, {id: path, label: displayName(path), type: "file"}];
}

/**
 * The `Catalog / db / schema / table [/ column]` trail for a `/projects/<id>/data/...` route.
 * Unlike the workspace tree, these are literal URL segments, and every prefix is a real,
 * linkable location: a database/schema prefix filters the catalog list, a table/column prefix
 * opens the detail (see catalog-model routing). So every crumb carries a `to`.
 */
function dataTrail(segments: string[]): BreadCrumb[] {
    const nav = DashNavigator.instance();
    const root: BreadCrumb = {id: "__data_root__", label: "Catalog", to: nav.getUrlFromLocation(DashLocations.CurrentProjectData()), type: "folder"};
    const crumbs = segments.map((seg, i): BreadCrumb => ({
        id: `data:${i}:${seg}`,
        label: seg,
        to: nav.getUrlFromLocation(DashLocations.CurrentProjectData(segments.slice(0, i + 1))),
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

function renderCrumb(crumb: BreadCrumb, isLast: boolean) {
    const nav = DashNavigator.instance();
    // A crumb links only when it has its own page (`to`) and isn't the current leaf. Structural
    // crumbs without a page (e.g. a `/data` database/schema) show as muted context labels.
    const navigable = !isLast && !!crumb.to;
    const linkClass = "truncate max-w-[160px] rounded-2xl px-1.5 py-1 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground";
    return (
        <BreadcrumbItem className="min-w-0">
            {navigable ? (
                <BreadcrumbLink
                    href={crumb.to}
                    onClick={nav.onClickNavigateToLocation(nav.getLocationFromUrl(crumb.to!))}
                    // Match the project button's ghost hover.
                    className={linkClass}
                >
                    {crumb.label}
                </BreadcrumbLink>
            ) : crumb.onClick && !isLast ? (
                <button type="button" onClick={crumb.onClick} className={linkClass}>{crumb.label}</button>
            ) : (
                <BreadcrumbPage className={`truncate max-w-[160px] px-1.5 py-1   hover:bg-accent rounded-2xl ${isLast ? "" : "text-muted-foreground"}`}>
                    {crumb.label}
                </BreadcrumbPage>
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
                            disabled={!crumb.to && !crumb.onClick}
                            onClick={crumb.to ? () => nav.navigateToLocation(nav.getLocationFromUrl(crumb.to!)) : crumb.onClick}
                        >
                            <span className="truncate">{crumb.label}</span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </BreadcrumbItem>
    );
}
