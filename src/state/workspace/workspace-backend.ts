/** A project's files: text by path, and every folder (including those only implied by a file's path). */
export interface WorkspaceSnapshot {
    files: Record<string, string>;
    dirs: string[];
}

/**
 * Where the workspace store's files are kept: the project's DuckDB in the browser, a folder in Electron. It
 * only persists; the store is what the app reads. See dev/workspace-files.md.
 */
export interface WorkspaceBackend {
    /** `onProgress(read, total)` follows the reading of the files, where the backend can tell. */
    load(onProgress?: (read: number, total: number) => void): Promise<WorkspaceSnapshot>;
    write(path: string, text: string): Promise<void>;
    mkdir(path: string): Promise<void>;
    /** A file or a folder with its contents. */
    move(from: string, to: string): Promise<void>;
    /** A file or a folder with its contents. */
    remove(path: string): Promise<void>;
    /** Changes made outside Dash; `text` is null for a removed file. Returns the unsubscribe. */
    watch?(onOutsideChange: (path: string, text: string | null) => void): () => void;
}
