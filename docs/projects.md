# Projects

A project is one workspace: its own relations, dashboards, canvases, cached results, and (in WASM)
its own data tables. Each project maps to its own DuckDB database file(s). The **URL is the source of
truth** for which project is open - see [routing.md](./routing.md).

## Project registry

The list of projects (id, name, slug, icon, timestamps) lives in browser `localStorage`, in the
`projects-state` Zustand store. It is not stored in DuckDB. Project ids are UUIDs; the seeded default
project has the fixed id `default`.

This is the same for both backends today, so the project list is shared between WASM and HTTP even
though the data behind each project is not. That's not the intended end state - see [TODO](#todo).

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

`initDashCatalog` (run by `setDatabaseConnection` on boot and switch) only ever runs
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
- **Backend-specific project registry.** The list of projects should come from a different source per
  backend:
  - **HTTP**: from a registry database in the root (the dash dir on the server), so the project list
    lives with the server data and is discoverable from the connection - not the browser.
  - **WASM**: from `localStorage` (browser), as it does now.

  Today the registry is `localStorage` for both, so the list is shared across backends while the data
  behind it is not.

  Rough approach (notes):
  - Add a "loading projects" step to the init pipeline (like the other `InitStep`s) that loads the
    registry before the rest of init.
  - Branch on the connection: WASM reads `localStorage`; HTTP attaches the registry DB in the root
    (the "local dash DB") and `SELECT`s the project list from it.
  - Open question: how to persist writes (create / rename / delete a project) for HTTP. Reads are a
    plain `SELECT` (fine through the wrapped query path), but writing the registry - and attaching the
    per-project state DB - hits the same DDL-can't-run-through-`query_result` problem, so it likely
    needs server support (a raw-exec endpoint, or the server owning the registry writes).
