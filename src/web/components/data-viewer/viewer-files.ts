import {create} from "zustand";

/**
 * The files opened in the data viewer, kept in the browser's OPFS under `data-viewer/` so they are there on the next
 * visit. A browser without OPFS writes (old Safari) keeps a file for the visit only.
 */

export type ViewerFormat = 'parquet' | 'csv';

export interface ViewerFile {
    name: string;
    size: number;
    format: ViewerFormat;
    lastModified: number;
}

interface ViewerFilesState {
    files: ViewerFile[];
    loaded: boolean;
    open?: string;
    /** The query reading the open file. */
    sql?: string;
    /** Counts the opens: opening a file again (or a new file of its name) runs it again, also when it is open. */
    opened: number;
}

export const useViewerFiles = create<ViewerFilesState>(() => ({files: [], loaded: false, opened: 0}));

const DIRECTORY = 'data-viewer';
// What the visit holds when OPFS can't keep it.
const unsaved = new Map<string, File>();

export function viewerFormat(name: string): ViewerFormat | undefined {
    const extension = name.split('.').pop()?.toLowerCase();
    if (extension === 'parquet') return 'parquet';
    if (extension === 'csv' || extension === 'tsv') return 'csv';
    return undefined;
}

async function directory(): Promise<FileSystemDirectoryHandle | undefined> {
    try {
        const root = await navigator.storage.getDirectory();
        return await root.getDirectoryHandle(DIRECTORY, {create: true});
    } catch {
        return undefined;
    }
}

function describe(file: File): ViewerFile {
    return {name: file.name, size: file.size, format: viewerFormat(file.name)!, lastModified: file.lastModified};
}

function setFiles(files: ViewerFile[]) {
    useViewerFiles.setState({files: files.sort((a, b) => b.lastModified - a.lastModified), loaded: true});
}

/** Reads the kept files into the store. */
export async function loadViewerFiles(): Promise<void> {
    const dir = await directory();
    const files: ViewerFile[] = [...unsaved.values()].map(describe);
    if (dir) {
        for await (const handle of (dir as unknown as { values(): AsyncIterable<FileSystemHandle> }).values()) {
            if (handle.kind !== 'file' || !viewerFormat(handle.name) || unsaved.has(handle.name)) continue;
            files.push(describe(await (handle as FileSystemFileHandle).getFile()));
        }
    }
    setFiles(files);
}

/** Keeps `file`, replacing one of the same name, and returns it as kept. */
export async function addViewerFile(file: File): Promise<ViewerFile> {
    const dir = await directory();
    let kept = false;
    if (dir) {
        try {
            const handle = await dir.getFileHandle(file.name, {create: true});
            const writable = await handle.createWritable();
            await file.stream().pipeTo(writable);
            kept = true;
        } catch {
            await dir.removeEntry(file.name).catch(() => undefined);
        }
    }
    if (kept) unsaved.delete(file.name);
    else unsaved.set(file.name, file);
    const entry = {...describe(file), lastModified: Date.now()};
    setFiles([entry, ...useViewerFiles.getState().files.filter(f => f.name !== file.name)]);
    return entry;
}

/** The file's contents, from OPFS or the visit. */
export async function readViewerFile(name: string): Promise<File> {
    const held = unsaved.get(name);
    if (held) return held;
    const dir = await directory();
    if (!dir) throw new Error(`${name} is not kept in this browser`);
    return (await dir.getFileHandle(name)).getFile();
}

export async function deleteViewerFile(name: string): Promise<void> {
    unsaved.delete(name);
    const dir = await directory();
    await dir?.removeEntry(name).catch(() => undefined);
    const {files, open} = useViewerFiles.getState();
    useViewerFiles.setState(open === name ? {files: files.filter(f => f.name !== name), open: undefined, sql: undefined} : {files: files.filter(f => f.name !== name)});
}

export function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = bytes / 1024;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }
    return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}
