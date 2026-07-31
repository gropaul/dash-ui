# Projects

A project is one workspace: its own relations, dashboards, canvases, cached results, and (in WASM)
its own data tables. Each project maps to its own DuckDB database file(s). The **URL is the source of
truth** for which project is open - see [routing.md](./routing.md).

## Project registry

The list of projects lives in a per-connection meta database (`projects.duckdb`, attached as the
`projects` catalog), as a plain relational table - one row per project with columns
`id, name, icon, root_path, created_at, opened_at, sources_sql`
(see `src/state/projects/project-registry-storage.ts`). Project ids are UUIDs; the seeded default
project has the fixed id `default`.

Because the registry is stored on the connection, each backend keeps its own independent project
list: a WASM instance's OPFS and an HTTP server each have their own `projects.duckdb`. Saves are
whole-registry snapshots: on every project change the `projects.state` store subscription replaces
the table in one atomic `CREATE OR REPLACE TABLE`, followed by a `CHECKPOINT`. (A single statement
on purpose: `executeQuery` splits multi-statement SQL, and over HTTP each statement is its own
request, so a `BEGIN`/`COMMIT` pair can't be relied on to share a session.)

## Per-project databases

Each project has up to two DuckDB databases, with the project id in the file name:

### State database - `<projectId>_dash_state.duckdb`, attached as `dash`

Exists for every backend (WASM and HTTP). Holds everything the app manages:

- `dash.main.relationState` - the relation / dashboard / canvas / editor-tree definitions (one JSON row).
- `dash.cache.*` - cached (materialized) query results. Also acts as the per-project "last used" set.
- `dash.refs.*` - the `node_<name>()` SQL macros that let relations reference each other.

### Data database - `<projectId>_dash_data.duckdb`, attached as `data` (WASM only)

Holds the user's own tables (imports, `CREATE TABLE`). It is the default catalog (`USE data`), so
unqualified table names resolve here.

For HTTP there is **no** per-project data database - user tables live in the server's base connection
and are shared across projects. Only the state database is per-project over HTTP.

## Where the files live (storage root)

Full attach path = `root + fileName`. The connection decides the root, via
`DatabaseConnection.getStorageRoot()`:

- **WASM / md-wasm**: `opfs://`. Files sit in the OPFS root. OPFS is flat (no subdirectories), so the
  project id is encoded in the file name, not a folder.
- **HTTP**: the DuckDB `dash` extension's data directory (e.g. `~/.duckdb/extension_data/dash/`),
  fetched from the server via `GET /api/dash-dir`.

## Attaching and switching

On startup and on every project switch, the client attaches the current project's databases; there is
no full teardown/reconnect.

- **WASM**: the default catalog is a throwaway `:memory:` database (`memory`). `data` and `dash` are
  attached on top and `USE data` makes the data DB current. A switch just detaches those two catalogs
  and re-attaches the new project's files (the provider re-registers the OPFS file handles first). The
  `query_result_json` helper macro is a `TEMP` macro, so it survives catalog swaps.
- **HTTP**: only `dash` is per-project; `data` is the shared server connection.

`initProjectCatalog` (run by `setDatabaseConnection` on boot and switch) only ever runs
`ATTACH IF NOT EXISTS`. It cannot detach/re-attach `dash` from this layer, because every statement is
wrapped in `query_result()` - client-side for WASM, server-side for HTTP - and `query_result` can't
execute catalog-mutating DDL (`DETACH` / a fresh `ATTACH` fail inside it). So switching the state DB
to another project has to happen where a raw connection is available:

- **WASM**: the provider does it. It attaches/detaches `data` and `dash` on its raw connection, so
  per-project switching works fully.
- **HTTP**: not client-driven. The `ATTACH IF NOT EXISTS` no-ops against the extension's default
  `dash.duckdb`, so today all projects share it. Real per-project HTTP needs the **server** to attach
  the correct `<projectId>_dash_state.duckdb` (it can run raw DDL and knows the dash dir). `getStorageRoot()`
  / `GET /api/dash-dir` is the first half of that; the server also needs to attach the file for the
  project the client is on.

## Persistence

Relation state writes to `dash.main.relationState` are throttled (`STORAGE_THROTTLE_TIME_MS`, 2s) and
followed by a `CHECKPOINT` of the `dash` database so the change is flushed to the file. The app bar
shows a spinner while a write is in flight and nothing once everything is saved.

## TODO

Not yet done:

- **Per-project state over HTTP.** The client can't attach per-project state files, because catalog
  DDL (`ATTACH`/`DETACH`) can't run through the `query_result`-wrapped query path. The server has to
  attach `<projectId>_dash_state.duckdb` for the project the client is on. Until then all HTTP projects
  share the extension's single `dash.duckdb`.
- ~~**Backend-specific project registry.**~~ Done: the registry lives in the per-connection
  `projects.duckdb` (see [Project registry](#project-registry)), loaded by the `loading-projects`
  init step. Registry reads and the snapshot write both go through the raw (non-`query_result`)
  query path, so they work on both backends.
