# Projects

A project is one workspace: its own relations, dashboards, canvases, cached results, and (in WASM)
its own data tables. Each project maps to its own DuckDB database file(s). The **URL is the source of
truth** for which project is open - see [routing.md](./routing.md).

## Project registry

The list of projects lives in a per-connection meta database (`projects.duckdb`, attached as the
`dash_projects` catalog), as a plain relational table - one row per project with columns
`id, name, icon, location, root_path, opened_at` (see `src/state/projects/project-registry-storage.ts`).
`location` is the project file relative to the storage root. Project ids are UUIDs; the seeded default
project has the fixed id `default`.

The registry holds only what this machine needs to list and open a project. Name and icon are the
local truth here and are mirrored into the project file (see below) so they travel with it; `root_path`
stays here because it names a folder on this machine.

Because the registry is stored on the connection, each backend keeps its own independent project
list: a WASM instance's OPFS and an HTTP server each have their own `projects.duckdb`. Saves are
whole-registry snapshots: on every project change the `projects.state` store subscription replaces
the table in one atomic `CREATE OR REPLACE TABLE`, followed by a `CHECKPOINT`. (A single statement
on purpose: `executeQuery` splits multi-statement SQL, and over HTTP each statement is its own
request, so a `BEGIN`/`COMMIT` pair can't be relied on to share a session.)

## Per-project databases

Each project has two DuckDB files, with the project id in the file name (`dev/project-file-layout.md`
records the reasoning):

### Project file - `<projectId>.dash.duckdb`, attached as `dash`

The project itself, and the artifact to hand over when sharing one. It is the default catalog
(`USE dash`), so unqualified table names resolve here.

- `dash.main.*` - the user's own tables (imports, `CREATE TABLE`).
- `dash.dash_meta.project` - one row: name, icon, `sources_sql` (the data-sources manifest replayed on
  open), `created_at`, `layout_version`. Loaded into the projects store as `currentMeta`; the sources
  editor, rename and icon change write through it (`src/state/projects/project-meta-storage.ts`).
- `dash.dash_state.relationState` - the relation / dashboard / canvas / editor-tree definitions (one JSON row).
- `dash.refs.*` - the `node_<name>()` SQL macros that let relations reference each other.

The `dash_meta`, `dash_state` and `refs` schemas are hidden from the catalog and the editor's schema
listing outside debug mode (`dashInternalObjectsFilter` in `global-data.ts`); everything else in `dash`
is user content.

### Cache file - `<projectId>.cache.duckdb`, attached as `dash_cache`

`dash_cache.main.*` holds the cached (materialized) query results and doubles as the per-project
"last used" set. Kept out of the project file so a shared file carries no derived data and so a
read-only open can later swap in an in-memory catalog instead.

## Where the files live (storage root)

Full attach path = `root + fileName`. The connection decides the root, via
`DatabaseConnection.getStorageRoot()`:

- **WASM / md-wasm**: `opfs://`. Files sit in the OPFS root. OPFS is flat (no subdirectories), so the
  project id is encoded in the file name, not a folder.
- **HTTP**: the DuckDB `dash` extension's data directory (e.g. `~/.duckdb/extension_data/dash/`),
  fetched from the server via `GET /api/dash-dir`. That endpoint returns the directory without a
  trailing separator, so `getStorageRoot()` appends one - otherwise every file would be created as a
  sibling of the directory with its name glued on (`.../extension_data/dash<uuid>.dash.duckdb`).

## Attaching and switching

On startup and on every project switch, the client attaches the current project's databases; there is
no full teardown/reconnect.

- **WASM**: the default catalog is a throwaway `:memory:` database (`memory`). `dash` and `dash_cache`
  are attached on top and `USE dash` makes the project file current. A switch just detaches those two
  catalogs and re-attaches the new project's files (the provider re-registers the OPFS file handles
  first). The `query_result_json` helper macro is a `TEMP` macro, so it survives catalog swaps.
- **HTTP**: the same client-driven flow, and it works. The extension wraps every statement in
  `query_result()`, which runs it on a transient connection, but `ATTACH`/`DETACH` act on the shared
  `DatabaseInstance`, so they outlive the request. The extension pre-attaches its own `dash.duckdb`
  at load; the client detaches that and attaches the project's file under the same alias.

  What does **not** survive a request is connection-scoped state: `USE dash` and `TEMP` macros are
  gone by the next statement (`SELECT current_database()` reports `memory`). Nothing depends on the
  `USE` today because relations qualify their catalog, but unqualified DDL resolves against `memory`
  over HTTP, not against the project file.

After attaching, `loadProject` reads the meta row (seeding it from the registry entry for a fresh
file and refreshing the name/icon copy), replays `sources_sql`, then rehydrates the relation state.

## Persistence

Relation state writes to `dash.dash_state.relationState` are throttled (`STORAGE_THROTTLE_TIME_MS`, 2s) and
followed by a `CHECKPOINT` of the `dash` database so the change is flushed to the file. The app bar
shows a spinner while a write is in flight and nothing once everything is saved.

## TODO

Not yet done:

- **A session over HTTP.** Each request runs on its own connection, so `USE` and `TEMP` macros do not
  persist. Making unqualified DDL land in the project file needs the server to hold one connection per
  client.
- ~~**Backend-specific project registry.**~~ Done: the registry lives in the per-connection
  `projects.duckdb` (see [Project registry](#project-registry)), loaded by the `loading-projects`
  init step. Registry reads and the snapshot write both go through the raw (non-`query_result`)
  query path, so they work on both backends.
