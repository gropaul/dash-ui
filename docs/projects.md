# Projects

A project is a folder: its pages (`.md`), queries (`.sql`) and subfolders, a `dash.yaml` with its id and name, and
a `sources.sql` with its data sources. The **URL is the source of truth** for which project is open
(`/projects/<id>/…`) - see [routing.md](./routing.md). The plan and its reasoning: `dev/folder-projects.md`.

## Folders and the project list

`src/state/projects/project-hosts.ts` picks a host by connection:

| Connection | Folder | Project list | Backend |
|---|---|---|---|
| Electron (`duckdb-native`) | any folder; new ones in `~/Documents/Dash/<name>` | recents in localStorage | `FolderBackend` over `electron/workspace-fs.cjs` |
| WASM, MotherDuck | `projects/<id>/` in OPFS | the OPFS folders | `OpfsBackend` |
| duckdb-over-http | the server's working directory, the only project | that one | `ServerBackend`: `glob` + `read_text`, the server's file endpoints |

- `dash.yaml` is written when Dash first opens a folder (a new id, the folder name as the name). Renaming the project
  edits `name`; the folder keeps its name. It is hidden from the file tree and the agent's file list.
- `sources.sql` at the root is a normal file in the tree; it opens the Data sources view, is replayed on open and is
  never a `refs` macro (`kindOf` gives it the kind `sources`).
- Electron's "Remove from list" only forgets a project; the browser's "Delete" removes its OPFS folder and databases.

## Per-project databases

Each project has two DuckDB files in the connection's storage root, named by the id:

- `<id>.dash.duckdb`, attached as `dash` and made the default catalog (`USE dash`): user tables in `main` (in WASM the
  only place they persist), the `refs.*` query macros, `dash_state`.
- `<id>.cache.duckdb`, attached as `dash_cache`: cached query results, kept out of the project file.

The storage root: `opfs://` in WASM (OPFS is flat for DuckDB, so the id is in the file name), the `dash` extension's
data directory over HTTP (`GET /api/dash-dir`), and `~/.duckdb/extension_data/dash/` (or `DASH_STORAGE_DIR`) in
Electron.

## Opening and switching

`loadOrSwitchProject` (serialized) closes the open project, undoes its sources, attaches the new project's two
databases, loads its folder into the workspace store, syncs `dash.yaml`, replays `sources.sql`, then registers the
query macros. Changes to files save at once through the backend; the app bar's save indicator follows them
(`save-status.state.ts`).
