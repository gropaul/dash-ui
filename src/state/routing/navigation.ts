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
 * URL scheme (only the workspace side carries a project; `/data` is global):
 *   /projects                        → the projects list
 *   /projects/<slug>                 → that project's root folder
 *   /projects/<slug>/<seg>/<seg>…    → an object (folder/relation/dashboard/canvas)
 *   /data/<seg>…                    → the catalog
 *
 * A URL round-trips through a typed {@link DashLocation}, so callers never assemble URL
 * strings by hand — they build a location and call `navigateTo` / `getUrlFrom`.
 */
import {nodeAtObjectSlugPath, objectSlugPathForId} from "@/state/routing/core-model";
import {useRelationsState} from "@/state/relations.state";
import {buildRoutableTree} from "@/state/routing/routable-tree";
import {useProjectsState} from "@/state/projects.state";

export const PROJECT_ROOT = "/projects";
export const DATA_ROOT = "/data";

// A workspace object at `/projects/<slug>/<path…>` (empty path is the project root).
export interface ProjectLocation {
    basePath: "object";
    projectSlug?: string;
    path: string[];
}

// A catalog location at `/data/<segments…>`.
export interface DataLocation {
    basePath: "data";
    segments: string[];
}

export type DashLocation = ProjectLocation | DataLocation;

export class DashLocations {
    static DataRoot(): DataLocation {
        return this.DataElement([]);
    }

    static DataElement(segments: string[]): DataLocation {
        return {
            basePath: "data",
            segments
        };
    }

    static CurrentProjectElement(path: string[]): ProjectLocation {
        return {
            basePath: "object",
            projectSlug: useProjectsState.getState().getCurrentProject().slug,
            path
        };
    }

    static CurrentProjectRoot() {
        return this.CurrentProjectElement([]);
    }

    static ProjectsList(): ProjectLocation {
        return {
            basePath: "object",
            projectSlug: undefined,
            path: []
        };
    }

    static ProjectRoot(projectSlug: string) {
        return this.ProjectElement(projectSlug, []);

    }

    static ProjectElement(projectSlug: string, path: string[]): ProjectLocation {
        return {
            basePath: "object",
            projectSlug,
            path
        }
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
            case "object": {
                // No slug → the project list at /projects.
                if (!location.projectSlug) return PROJECT_ROOT;
                const base = PROJECT_ROOT + "/" + encodeURIComponent(location.projectSlug);
                return location.path.length ? base + "/" + encodeSegments(location.path) : base;
            }
            case "data":
                return location.segments.length ? DATA_ROOT + "/" + encodeSegments(location.segments) : DATA_ROOT;
        }
    }

    getUrlFromObjectId(id: string): string {
        const location = this.getLocationFromObjectId(id);
        return this.getUrlFromLocation(location);
    }

    getLocationFromUrl(url: string = this.currentUrl()): DashLocation {
        const parts = splitPath(url);
        if (parts[0] === "data") return {basePath: "data", segments: parts.slice(1)};
        if (parts[0] === "projects") {
            if (parts.length === 1) return DashLocations.ProjectsList();
            const projectSlug = parts[1];
            const path =  parts.slice(2)
            return DashLocations.ProjectElement(projectSlug, path);
        }
        // `/` and anything else → the project list.
        return DashLocations.CurrentProjectRoot();
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

    getObjectFromLocation(location: ProjectLocation) {
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

    // if there is an object open, return it, else null
    getCurrentObject() {
        const currentLocation = this.getCurrentLocation();
        if (currentLocation.basePath !== "object") return null;
        return this.getObjectFromLocation(currentLocation);
    }

    isCurrentObjectIdShown(id: string): boolean {
        const currentLocation = this.getCurrentLocation();
        if (currentLocation.basePath !== "object") return false;
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
