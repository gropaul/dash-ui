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
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {useProjectsState, useRoutedProject} from "@/state/projects.state";
import {useGUIState} from "@/state/gui.state";
import {ancestorsOf, parentOf} from "@/state/workspace/paths";
import {buildWorkspaceTree, displayName} from "@/state/workspace/workspace-tree";
import {useWorkspace} from "@/state/workspace/workspace.state";
import {ChevronRight} from "lucide-react";
import {ColoredIcon} from "@/components/basics/files/icon-factories";
import {fileIconType} from "@/components/workspace/file-icon";

// Above this many crumbs the middle collapses into an expandable ellipsis
// (first + … + last two), keeping the bar on a single line.
const MAX_VISIBLE = 6;
// A folder crumb's dropdown lists at most this many of the folder's entries.
const MAX_FOLDER_ENTRIES = 20;

/**
 * The path to the currently-routed view, rendered as a shadcn Breadcrumb. Handles the project sections:
 *  - `/projects/<id>/workspace/<path>`: the open file's path. A folder segment drops down the folder's
 *    entries, since folders have no view of their own.
 *  - `/projects/<id>/data/...`: the catalog; a literal `Data / db / schema / table [/ column]` trail built
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
    /** For a folder crumb: the folder whose entries its dropdown lists. */
    folder?: {projectId: string; path: string};
    type: string;
}

function openFolderInTree(projectId: string, dir: string) {
    const setOpen = useGUIState.getState().setWorkspaceFolderOpen;
    [...ancestorsOf(dir), dir].forEach(d => setOpen(projectId, d, true));
}

/** The open file's folders, each dropping down its entries, and the file's name. */
function workspaceTrail(projectId: string, segments: string[]): BreadCrumb[] {
    const path = segments.join('/');
    const folders = ancestorsOf(path).map((dir, i): BreadCrumb => ({
        id: `dir:${dir}`, label: segments[i], onClick: () => openFolderInTree(projectId, dir),
        folder: {projectId, path: dir}, type: "folder",
    }));
    return [...folders, {id: path, label: displayName(path), type: "file"}];
}

/**
 * The `Data / db / schema / table [/ column]` trail for a `/projects/<id>/data/...` route.
 * Unlike the workspace tree, these are literal URL segments, and every prefix is a real,
 * linkable location: a database/schema prefix filters the catalog list, a table/column prefix
 * opens the detail (see catalog-model routing). So every crumb carries a `to`.
 */
function dataTrail(segments: string[]): BreadCrumb[] {
    const nav = DashNavigator.instance();
    const root: BreadCrumb = {id: "__data_root__", label: "Data", to: nav.getUrlFromLocation(DashLocations.CurrentProjectData()), type: "folder"};
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
    const linkClass = "truncate max-w-[320px] rounded-2xl px-1.5 py-1 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground";
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
            ) : crumb.folder && !isLast ? (
                <DropdownMenu>
                    <DropdownMenuTrigger className={linkClass}>{crumb.label}</DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-w-[320px]">
                        <FolderEntries projectId={crumb.folder.projectId} folder={crumb.folder.path}/>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : crumb.onClick && !isLast ? (
                <button type="button" onClick={crumb.onClick} className={linkClass}>{crumb.label}</button>
            ) : (
                <BreadcrumbPage className={`truncate max-w-[320px] px-1.5 py-1   hover:bg-accent rounded-2xl ${isLast ? "" : "text-muted-foreground"}`}>
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

/**
 * The folders and files directly in `folder`: a file opens, a folder is a submenu of its own entries. A submenu's
 * content mounts only while it is open, so each folder is listed when first shown.
 */
function FolderEntries({projectId, folder}: {projectId: string; folder: string}) {
    const files = useWorkspace(s => s.files);
    const dirs = useWorkspace(s => s.dirs);
    const nav = DashNavigator.instance();
    const entries = React.useMemo(() => {
        const inFolder = (p: string) => parentOf(p) === folder;
        return buildWorkspaceTree(Object.keys(files).filter(inFolder), [...dirs].filter(inFolder));
    }, [files, dirs, folder]);
    const shown = entries.slice(0, MAX_FOLDER_ENTRIES);
    return (
        <>
            {shown.map(node => node.kind === "folder" ? (
                <DropdownMenuSub key={node.path}>
                    <DropdownMenuSubTrigger>
                        <ColoredIcon type={fileIconType(node)} size={16} background={false}/>
                        <span className="truncate">{node.name}</span>
                        <ChevronRight className="ml-auto text-muted-foreground"/>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="max-w-[320px]">
                        <FolderEntries projectId={projectId} folder={node.path}/>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
            ) : (
                <DropdownMenuItem
                    key={node.path}
                    onClick={() => nav.navigateToLocation(DashLocations.ProjectWorkspace(projectId, node.path.split('/')))}
                >
                    <ColoredIcon type={fileIconType(node)} size={16} background={false}/>
                    <span className="truncate">{node.name}</span>
                </DropdownMenuItem>
            ))}
            {entries.length === 0 && <DropdownMenuItem disabled>Empty</DropdownMenuItem>}
            {entries.length > shown.length && (
                <DropdownMenuItem disabled>{entries.length - shown.length} more</DropdownMenuItem>
            )}
        </>
    );
}
