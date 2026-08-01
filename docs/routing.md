# Routing

Dash routes entirely on the **client**. Because the app is a static export
(`output: 'export'`), Next can't serve arbitrary runtime routes (dynamic ids aren't known at
build time). So there is one static shell (`app/page.tsx`) and we drive everything from the
URL with the History API. Deep links / refresh work because the host serves `index.html` for
unknown paths (vercel.json rewrite; the C++ extension file-server fallback).

## URL scheme

A specific project is addressed by **id** and carries a **section**; everything except the
projects list lives under a project.

```
/projects                              → the projects list
/projects/<id>/workspace               → that project's root folder
/projects/<id>/workspace/<seg>/<seg>…  → an object (folder / relation / dashboard / canvas)
/projects/<id>/connections             → that project's connections tab
/projects/<id>/data/<seg>…             → that project's catalog (db / schema / table / column)
```

Bare `/projects/<id>` (and any unknown section) resolves to the workspace. `/projects/<id>/sources`
is the legacy segment for the connections tab and still parses, but is never generated.

Query params carry ephemeral view state, e.g. `?readonly=1` opens a dashboard in view mode.

## The one place: `DashNavigator`

`src/state/routing/navigation.ts` is the single home for every routing concern — a singleton
reached via `DashNavigator.instance()`. Callers never build URL strings by hand; they build a
typed **location** and hand it to the navigator.

```ts
type DashLocation = ProjectLocation | ProjectsListLocation;

// discriminated on `section`, so each section only carries the address shape it has
type ProjectLocation =
    | { basePath: "project"; projectId: string; section: "workspace"; path: string[] }
    | { basePath: "project"; projectId: string; section: "connections" }
    | { basePath: "project"; projectId: string; section: "data"; segments: string[] };

interface ProjectsListLocation { basePath: "projects"; }
```

Build locations with the `DashLocations` factory (don't construct the objects inline):

```ts
DashLocations.CurrentProjectRoot()               // current project, root folder
DashLocations.CurrentProjectElement(path)        // current project, slug-name path
DashLocations.ProjectWorkspace(projectId, path)  // a specific project's workspace
DashLocations.ProjectConnections(projectId)      // a project's connections tab
DashLocations.CurrentProjectConnections()
DashLocations.ProjectData(projectId, segments)   // a project's catalog
DashLocations.CurrentProjectData(segments)
DashLocations.ProjectsList()                     // the /projects list
```

Key navigator methods:

| Method | Purpose |
|---|---|
| `navigateToLocation(loc, replace?)` | Push (or replace) the URL for a location. |
| `navigateToObjectId(id, replace?)` | Navigate to a workspace object by its tree-node id. |
| `onClickNavigateToLocation(loc)` / `onClickNavigateToObjectId(id)` | `onClick` handlers that soft-navigate but honor cmd/ctrl/middle-click (open-in-new-tab). |
| `getUrlFromLocation(loc)` / `getUrlFromObjectId(id)` | Serialize a location → URL string (for `href`, copy-link). |
| `getLocationFromUrl(url?)` | Parse a URL → `DashLocation` (defaults to the current URL). |
| `getCurrentLocation()` | The current location, cached by URL for referential stability. |
| `getCurrentObject()` / `isCurrentObjectIdShown(id)` | The tree node currently on screen, resolved against the live tree. |
| `getQueryParam(k)` / `setQueryParam(k, v)` | Read/write a query-string param (set uses `replaceState`). |
| `subscribe(fn)` | Notified on push/replace + browser back/forward. |

## Reading the URL in React

`src/state/routing/use-dash-location.ts` wraps the navigator's `subscribe` +
`getCurrentLocation` in `useSyncExternalStore`:

```ts
const location = useDashLocation();        // reactive DashLocation
const readonly = useDashQueryParam("readonly");
```

## Objects: identity vs. address

- **Identity** is the stable tree-node `id` (never derived from the name).
- **Address** is a path of **slug-names** — each segment is `slugify(displayName)`, made unique
  among siblings by a `-2` suffix. This is derived, not stored.

Pure, store-agnostic helpers live in `src/state/routing/core-model.ts`:

- `objectSlugPathForId(tree, id)` — id → slug path
- `nodeAtObjectSlugPath(tree, segments)` — slug path → node (inverse)
- `crumbsForSegments(tree, segments)` — breadcrumb labels + cumulative slug paths

Slug derivation is `src/state/routing/slug-name.ts` (`slugify`, `computeSiblingSlugNames`).
Note: slug-names are for **URLs**; the underscore-based SQL macro names (`refs.<name>()`) are a
separate concern in `state/relations/sql/`.

### Aliases (relations under dashboards/canvases)

A dashboard/canvas has no children in the tree but *references* relations. `routable-tree.ts`
`buildRoutableTree(...)` augments the tree so a referenced relation is addressable as a virtual
child (`…/Sales Dashboard/Q4 Revenue`). `aliasRelationLocation(...)` builds that contextual
location; `getCurrentObject` / resolution always go through the augmented tree so alias URLs
resolve.

## The routers

`src/components/layout/app-router.tsx` reads `useDashLocation()` and dispatches by `basePath`:

- `projects` → the projects list (`ProjectListView`)
- otherwise → `sub-router/router-project.tsx`, which renders:
  - unknown project id → a not-found state
  - `section: "connections"` → `ConnectionsView`
  - `section: "data"` → the catalog (`CatalogView`)
  - empty workspace `path` → the project root folder
  - otherwise → resolve the node and render `FolderView` / `RelationTab` / `DashboardTab` / `CanvasTab`, or not-found

`AppRouter` also mounts `useProjectRouteSync()` (`state/projects.state.ts`): when the URL's
`/projects/<id>` names a known project that isn't loaded, it switches to it — the **URL is the
source of truth** for the current project.

## Recipes

```ts
const nav = DashNavigator.instance();

// open an object by id (e.g. from the command palette or a list row)
nav.navigateToObjectId(node.id);
<a onClick={nav.onClickNavigateToObjectId(node.id)} href={nav.getUrlFromObjectId(node.id)}>…</a>

// go to the current project's root, or a specific project
nav.navigateToLocation(DashLocations.CurrentProjectRoot());
nav.navigateToLocation(DashLocations.ProjectWorkspace(project.id));

// catalog
nav.navigateToLocation(DashLocations.CurrentProjectData([db, schema, table]));

// what's on screen right now?
const shown = nav.getCurrentObject();

// copy a shareable link
const url = window.location.origin + nav.getUrlFromObjectId(node.id);
```

## Files

| File | Role |
|---|---|
| `state/routing/navigation.ts` | `DashNavigator` singleton, `DashLocation`, `DashLocations` — the one place. |
| `state/routing/use-dash-location.ts` | React hooks (`useDashLocation`, `useDashQueryParam`). |
| `state/routing/core-model.ts` | Pure id ⇄ slug-path ⇄ node helpers + breadcrumbs. |
| `state/routing/slug-name.ts` | `slugify` + sibling-unique slug names. |
| `state/routing/routable-tree.ts` | Augments the tree with dashboard/canvas relation aliases. |
| `components/layout/app-router.tsx` | Top-level dispatch + project↔URL sync. |
| `components/layout/sub-router/` | `router-project` (workspace / connections / catalog). |
| `state/projects.state.ts` | Projects + `useProjectRouteSync` (URL is source of truth). |
