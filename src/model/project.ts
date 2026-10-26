/**
 * A project is a folder: its pages and queries, `dash.yaml` (id and name) and `sources.sql`. Its result cache
 * and, in the browser, its data tables are DuckDB files named by the id. Projects are addressed by id everywhere,
 * including `/projects/<id>/…` URLs. See dev/folder-projects.md.
 */
export interface Project {
    id: string;
    name: string;
    /** The folder: an absolute path in Electron, the OPFS folder's name in the browser, '' for the server's working directory. */
    folder: string;
    // Last-opened timestamp - drives the switcher ordering (most recent first).
    openedAt: number;
}
