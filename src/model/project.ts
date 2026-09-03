/**
 * A project is one workspace, stored as one DuckDB file (`<id>.dash.duckdb`, see
 * `dev/project-file-layout.md`). Two records describe it:
 *
 * - {@link Project}: the registry row in the per-connection `projects.duckdb`. What this machine
 *   needs to list and open the project without touching its file.
 * - {@link ProjectMeta}: the `dash_meta.project` row inside the file. Travels with the file when a
 *   project is shared. Name and icon are duplicated into it from the registry, which is the local
 *   truth for both; the file copy is refreshed on open and on rename.
 *
 * Projects are addressed by id everywhere, including `/project/<id>/…` URLs.
 */

// The Dash logo ('dash') is the default; the rest are lucide presets (see project-icons.tsx).
export type ProjectIconKey =
    | 'dash'
    | 'database'
    | 'chart'
    | 'rocket'
    | 'flask'
    | 'compass'
    | 'box'
    | 'layers'
    | 'sparkles';

export const DEFAULT_PROJECT_ICON: ProjectIconKey = 'dash';

export interface Project {
    id: string;
    name: string;
    icon: ProjectIconKey;
    // The project file, relative to the connection's storage root.
    location: string;
    // The folder this project auto-opens from. In directory/HTTP mode it's a real filesystem path;
    // in WASM mode there's no filesystem, so it's the virtual root ("/").
    rootPath: string;
    // Last-opened timestamp — drives the switcher ordering (most recent first).
    openedAt: number;
}

export interface ProjectMeta {
    name: string;
    icon: ProjectIconKey;
    // The project's data-sources manifest: plain DuckDB SQL (ATTACH / CREATE VIEW / secrets …)
    // replayed on open. The single source of truth for the Data sources tab.
    sourcesSql: string;
    createdAt: number;
    // DASH_STORAGE_VERSION at the time of the last write, so a newer app can migrate the file and
    // an older one can refuse it.
    layoutVersion: number;
}
