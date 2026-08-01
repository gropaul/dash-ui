/**
 * Navigation — the single home for every routing concern.
 *
 * Static export (`output: 'export'`) can't serve arbitrary runtime dynamic routes through
 * Next's router (dynamic routes need build-time generateStaticParams; runtime ids are
 * unknowable). So the app is one static shell (`app/page.tsx`) and we route entirely on the
 * client: push/replace the URL with History and notify subscribers. Deep-load/refresh works
 * because the host serves index.html for unknown paths (vercel.json rewrite; the C++
 * extension file-server fallback).
 *
 * URL scheme (a specific project is addressed by id and carries a section):
 *   /projects                          → the projects list
 *   /projects/<id>/workspace           → that project's root folder
 *   /projects/<id>/workspace/<seg>…    → an object (folder/relation/dashboard/canvas)
 *   /projects/<id>/connections         → that project's connections tab
 *   /projects/<id>/data/<seg>…         → that project's catalog
 *
 * A URL round-trips through a typed {@link DashLocation}, so callers never assemble URL
 * strings by hand — they build a location and call `navigateTo` / `getUrlFrom`.
 */
import {nodeAtObjectSlugPath, objectSlugPathForId} from "@/state/routing/core-model";
import {useRelationsState} from "@/state/relations.state";
import {buildRoutableTree} from "@/state/routing/routable-tree";
import {useProjectsState} from "@/state/projects.state";


export const PROJECT_ROOT = "/projects";   // the projects list, and the base for a specific project

/** A section within a project: the workspace object tree, the connections tab, or the catalog. */
export type ProjectSection = "workspace" | "connections" | "data";

// A location inside a specific project (by id), discriminated on `section` so each section
// only carries the address shape it actually has.
export interface ProjectWorkspaceLocation {
    basePath: "project";
    projectId: string;
    section: "workspace";
    // Addresses a workspace object; empty is the project root folder.
    path: string[];
}

export interface ProjectConnectionsLocation {
    basePath: "project";
    projectId: string;
    section: "connections";
}

// The catalog: `segments` are the part after `/data` ([db, schema, table, col?]).
export interface ProjectDataLocation {
    basePath: "project";
    projectId: string;
    section: "data";
    segments: string[];
}

export type ProjectLocation = ProjectWorkspaceLocation | ProjectConnectionsLocation | ProjectDataLocation;

// The projects list at `/projects`.
export interface ProjectsListLocation {
    basePath: "projects";
}

export type DashLocation = ProjectLocation | ProjectsListLocation;

export class DashLocations {
    static ProjectsList(): ProjectsListLocation {
        return {basePath: "projects"};
    }

    private static currentProjectId(): string {
        return useProjectsState.getState().currentProjectId;
    }

    // --- workspace (the object tree) -------------------------------------

    static CurrentProjectElement(path: string[]): ProjectWorkspaceLocation {
        return this.ProjectWorkspace(this.currentProjectId(), path);
    }

    static CurrentProjectRoot(): ProjectWorkspaceLocation {
        return this.CurrentProjectElement([]);
    }

    static ProjectWorkspace(projectId: string, path: string[] = []): ProjectWorkspaceLocation {
        return {basePath: "project", projectId, section: "workspace", path};
    }

    // --- connections -------------------------------------------------------

    static ProjectConnections(projectId: string): ProjectConnectionsLocation {
        return {basePath: "project", projectId, section: "connections"};
    }

    static CurrentProjectConnections(): ProjectConnectionsLocation {
        return this.ProjectConnections(this.currentProjectId());
    }

    // --- catalog -----------------------------------------------------------

    static ProjectData(projectId: string, segments: string[] = []): ProjectDataLocation {
        return {basePath: "project", projectId, section: "data", segments};
    }

    static CurrentProjectData(segments: string[] = []): ProjectDataLocation {
        return this.ProjectData(this.currentProjectId(), segments);
    }

}

function splitPath(url: string): string[] {
    return (url || "/").split("?")[0].split("#")[0].split("/").filter(Boolean).map(decodeURIComponent);
}

function encodeSegments(segments: string[]): string {
    return segments.map(encodeURIComponent).join("/");
}

export class DashNavigator {
    private static _instance: DashNavigator | null = null;

    static instance(): DashNavigator {
        return (this._instance ??= new DashNavigator());
    }

    private constructor() {
    }

    private readonly listeners = new Set<() => void>();
    // useSyncExternalStore needs a referentially-stable snapshot: recompute the location only
    // when the URL actually changes, otherwise hand back the same object.
    private cachedUrl: string | null = null;
    private cachedLocation: DashLocation | null = null;

    getUrlFromLocation(location: DashLocation): string {
        switch (location.basePath) {
            case "projects":
                return PROJECT_ROOT;
            case "project": {
                const base = PROJECT_ROOT + "/" + encodeURIComponent(location.projectId) + "/" + location.section;
                const rest = location.section === "workspace" ? location.path
                    : location.section === "data" ? location.segments
                        : [];
                return rest.length ? base + "/" + encodeSegments(rest) : base;
            }
        }
    }

    getUrlFromObjectId(id: string): string {
        const location = this.getLocationFromObjectId(id);
        return this.getUrlFromLocation(location);
    }

    getLocationFromUrl(url: string = this.currentUrl()): DashLocation {
        const parts = splitPath(url);
        if (parts[0] === "projects") {
            const projectId = parts[1];
            // `/projects` with no id → the list.
            if (!projectId) return DashLocations.ProjectsList();
            // `sources` is the legacy segment for this section, kept so older links still resolve.
            if (parts[2] === "connections" || parts[2] === "sources") return DashLocations.ProjectConnections(projectId);
            if (parts[2] === "data") return DashLocations.ProjectData(projectId, parts.slice(3));
            // Bare `/projects/<id>` (and any unknown section) resolves to the workspace.
            const path = parts[2] === "workspace" ? parts.slice(3) : parts.slice(2);
            return DashLocations.ProjectWorkspace(projectId, path);
        }
        // `/` and anything else → the projects list. The URL is the source of truth for which
        // project is open, so when it names none we show the list rather than guess a project.
        return DashLocations.ProjectsList();
    }

    getLocationFromObjectId(id: string): DashLocation {
        const path = objectSlugPathForId(useRelationsState.getState().editorElements, id);
        if (!path) {
            throw new Error(`Can't resolve object location for id ${id}: not in the editor tree`);
        }
        return DashLocations.CurrentProjectElement(path)
    }


    // --- navigation -------------------------------------------------------

    navigateToLocation(location: DashLocation, replace = false): void {
        if (typeof window === "undefined") return;
        const target = this.getUrlFromLocation(location);
        if (!replace && target === this.currentUrl()) return;
        if (replace) window.history.replaceState({}, "", target);
        else window.history.pushState({}, "", target);
        this.emit();
    }

    navigateToObjectId(id: string, replace = false): void {
        const location = this.getLocationFromObjectId(id);
        this.navigateToLocation(location, replace);
    }

    onClickNavigateToLocation(location: DashLocation, replace = false) {
        return (e: React.MouseEvent) => {
            if (e.defaultPrevented) return;
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            this.navigateToLocation(location, replace);
        };
    }

    onClickNavigateToObjectId(id: string) {
        return (e: React.MouseEvent) => {
            if (e.defaultPrevented) return;
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            this.navigateToObjectId(id);
        };
    }

    getObjectFromLocation(location: ProjectWorkspaceLocation) {
        const editorElements = useRelationsState.getState().editorElements;
        const st = useRelationsState.getState();
        const tree = buildRoutableTree(editorElements, st.relations, st.dashboards, st.canvas);
        return nodeAtObjectSlugPath(tree, location.path);
    }


    // --- query parameters ------------------------------------------------

    /** Read a query-string parameter from the current URL (null if absent). */
    getQueryParam(key: string): string | null {
        if (typeof window === "undefined") return null;
        return new URLSearchParams(window.location.search).get(key);
    }

    /**
     * Set (or, when value is null, remove) a query-string parameter, keeping the current
     * path and other params intact. Uses replaceState so toggling a mode doesn't spam history.
     */
    setQueryParam(key: string, value: string | null, replace = true): void {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        if (value === null) params.delete(key);
        else params.set(key, value);
        const query = params.toString();
        const target = window.location.pathname + (query ? "?" + query : "");
        if (replace) window.history.replaceState({}, "", target);
        else window.history.pushState({}, "", target);
        this.emit();
    }

    // --- reading the current location ------------------------------------


    /** The current location (cached by URL so it's referentially stable for React). */
    getCurrentLocation = (): DashLocation => {
        const url = this.currentUrl();
        if (url !== this.cachedUrl || !this.cachedLocation) {
            this.cachedUrl = url;
            this.cachedLocation = this.getLocationFromUrl(url);
        }
        return this.cachedLocation;
    };

    // if there is an object open, return it, else null. Objects live only in the workspace section.
    getCurrentObject() {
        const currentLocation = this.getCurrentLocation();
        if (currentLocation.basePath !== "project" || currentLocation.section !== "workspace") return null;
        return this.getObjectFromLocation(currentLocation);
    }

    isCurrentObjectIdShown(id: string): boolean {
        const currentLocation = this.getCurrentLocation();
        if (currentLocation.basePath !== "project" || currentLocation.section !== "workspace") return false;
        const currentObject = this.getObjectFromLocation(currentLocation);
        return currentObject?.id === id;
    }

    // --- Helper ----------------------------------------------------------

    private currentUrl(): string {
        return typeof window !== "undefined" ? window.location.pathname : "/";
    }

    // --- subscription (History push/replace + browser back/forward) -------

    readonly subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        if (typeof window !== "undefined") window.addEventListener("popstate", listener);
        return () => {
            this.listeners.delete(listener);
            if (typeof window !== "undefined") window.removeEventListener("popstate", listener);
        };
    };

    private emit(): void {
        this.listeners.forEach((l) => l());
    }
}
