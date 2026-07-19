/**
 * A Dash project: one logical workspace, backed by its own state store (a
 * `dash_<id>.duckdb` in WASM/OPFS, a `dash/` folder + registry row in directory
 * mode). This model is the registry entry — the pointer/metadata, not the content.
 *
 * The heavier storage + routing wiring (attaching per-project state, `/projects/<slug>`
 * URLs, `dash/` file sync) lands in follow-ups; this is the data model + GUI shell.
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
    // URL-safe, unique among projects — the `<slug>` in /projects/<slug>/... (routing TBD).
    slug: string;
    icon: ProjectIconKey;
    // The folder this project auto-opens from. In directory/HTTP mode it's a real filesystem path;
    // in WASM mode there's no filesystem, so it's the virtual root ("/").
    rootPath: string;
    createdAt: number;
    // Last-opened timestamp — drives the switcher ordering (most recent first).
    openedAt: number;
}
