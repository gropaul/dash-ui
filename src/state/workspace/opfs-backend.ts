import {WorkspaceBackend, WorkspaceSnapshot} from "@/state/workspace/workspace-backend";

/** The OPFS directory that holds a folder per browser project. */
export const OPFS_PROJECTS_DIR = 'projects';

export async function opfsProjectsDirectory(): Promise<FileSystemDirectoryHandle> {
    const root = await navigator.storage.getDirectory();
    return root.getDirectoryHandle(OPFS_PROJECTS_DIR, {create: true});
}

// The DOM lib in use doesn't type a directory's async iteration.
export function opfsEntries(dir: FileSystemDirectoryHandle): AsyncIterableIterator<[string, FileSystemHandle]> {
    return (dir as unknown as { entries(): AsyncIterableIterator<[string, FileSystemHandle]> }).entries();
}

export async function readOpfsText(dir: FileSystemDirectoryHandle, name: string): Promise<string | undefined> {
    try {
        return await (await (await dir.getFileHandle(name)).getFile()).text();
    } catch {
        return undefined;
    }
}

export async function writeOpfsText(dir: FileSystemDirectoryHandle, name: string, text: string): Promise<void> {
    const writable = await (await dir.getFileHandle(name, {create: true})).createWritable();
    await writable.write(text);
    await writable.close();
}

/**
 * The browser backend: the project's files are a folder in OPFS (`projects/<id>/`). Changes run one at a time,
 * so a later write to a file can't be overtaken by an earlier one.
 */
export class OpfsBackend implements WorkspaceBackend {
    private queue: Promise<unknown> = Promise.resolve();

    constructor(private folder: string) {
    }

    async load(onProgress?: (read: number, total: number) => void): Promise<WorkspaceSnapshot> {
        const handles: [string, FileSystemFileHandle][] = [];
        const dirs: string[] = [];
        await this.walk(await this.root(), '', handles, dirs);
        const files: Record<string, string> = {};
        for (const [i, [path, handle]] of handles.entries()) {
            files[path] = await (await handle.getFile()).text();
            onProgress?.(i + 1, handles.length);
        }
        return {files, dirs};
    }

    write = (path: string, text: string) => this.run(async () => {
        const {dir, name} = await this.parent(path, true);
        await writeOpfsText(dir, name, text);
    });

    mkdir = (path: string) => this.run(() => this.directory(path, true));

    // OPFS can't rename a directory, so a move copies the files over and removes the original.
    move = (from: string, to: string) => this.run(async () => {
        const snapshot = await this.load();
        const {dir: fromParent, name} = await this.parent(from, false);
        const moved = (p: string) => to + p.slice(from.length);
        for (const dir of snapshot.dirs.filter(d => d === from || d.startsWith(from + '/'))) await this.directory(moved(dir), true);
        for (const [path, text] of Object.entries(snapshot.files)) {
            if (path !== from && !path.startsWith(from + '/')) continue;
            const {dir, name: fileName} = await this.parent(moved(path), true);
            await writeOpfsText(dir, fileName, text);
        }
        await fromParent.removeEntry(name, {recursive: true});
    });

    remove = (path: string) => this.run(async () => {
        const {dir, name} = await this.parent(path, false);
        await dir.removeEntry(name, {recursive: true}).catch(() => undefined);
    });

    private run(change: () => Promise<unknown>): Promise<void> {
        const next = this.queue.then(change, change);
        this.queue = next.catch(() => undefined);
        return next.then(() => undefined);
    }

    private async root() {
        return (await opfsProjectsDirectory()).getDirectoryHandle(this.folder, {create: true});
    }

    private async directory(path: string, create: boolean): Promise<FileSystemDirectoryHandle> {
        let dir = await this.root();
        for (const segment of path.split('/').filter(Boolean)) dir = await dir.getDirectoryHandle(segment, {create});
        return dir;
    }

    private async parent(path: string, create: boolean) {
        const segments = path.split('/');
        const name = segments.pop()!;
        return {dir: await this.directory(segments.join('/'), create), name};
    }

    private async walk(dir: FileSystemDirectoryHandle, prefix: string, files: [string, FileSystemFileHandle][], dirs: string[]) {
        for await (const [name, handle] of opfsEntries(dir)) {
            const path = prefix ? `${prefix}/${name}` : name;
            if (handle.kind === 'directory') {
                dirs.push(path);
                await this.walk(handle as FileSystemDirectoryHandle, path, files, dirs);
            } else {
                files.push([path, handle as FileSystemFileHandle]);
            }
        }
    }
}
