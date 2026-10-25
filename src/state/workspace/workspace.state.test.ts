import {beforeEach, describe, expect, it} from "vitest";
import {useWorkspace} from "@/state/workspace/workspace.state";
import {WorkspaceBackend, WorkspaceSnapshot} from "@/state/workspace/workspace-backend";
import {BlobBackend} from "@/state/workspace/blob-backend";
import {ancestorsOf, isWithin, movedPath} from "@/state/workspace/paths";

/** A folder on disk, as the Electron backend has it: each operation changes only what it names. */
class FolderBackend implements WorkspaceBackend {
    files = new Map<string, string>();
    dirs = new Set<string>();
    outside?: (path: string, text: string | null) => void;

    async load(): Promise<WorkspaceSnapshot> {
        return {files: Object.fromEntries(this.files), dirs: [...this.dirs]};
    }

    async write(path: string, text: string) {
        ancestorsOf(path).forEach(dir => this.dirs.add(dir));
        this.files.set(path, text);
    }

    async mkdir(path: string) {
        [...ancestorsOf(path), path].forEach(dir => this.dirs.add(dir));
    }

    async move(from: string, to: string) {
        this.files = new Map([...this.files].map(([p, text]) => [isWithin(p, from) ? movedPath(p, from, to) : p, text]));
        this.dirs = new Set([...this.dirs].map(d => isWithin(d, from) ? movedPath(d, from, to) : d));
        ancestorsOf(to).forEach(dir => this.dirs.add(dir));
    }

    async remove(path: string) {
        [...this.files.keys()].filter(p => isWithin(p, path)).forEach(p => this.files.delete(p));
        [...this.dirs].filter(d => isWithin(d, path)).forEach(d => this.dirs.delete(d));
    }

    watch(onOutsideChange: (path: string, text: string | null) => void) {
        this.outside = onOutsideChange;
        return () => this.outside = undefined;
    }
}

function blobBackend() {
    let stored: string | null = null;
    return new BlobBackend(
        {getItem: async () => stored, setItem: async value => void (stored = value)},
        () => useWorkspace.getState().snapshot(),
    );
}

const sorted = ({files, dirs}: WorkspaceSnapshot) => ({files, dirs: [...dirs].sort()});

describe.each([
    ['blob', blobBackend],
    ['folder', () => new FolderBackend()],
])('%s backend', (_name, makeBackend) => {
    let backend: WorkspaceBackend;

    beforeEach(async () => {
        backend = makeBackend();
        await useWorkspace.getState().load(backend);
    });

    it('keeps what the store holds across a reload', async () => {
        const ws = useWorkspace.getState();
        await ws.write('Sales.md', '# Sales');
        await ws.write('Sales/orders.sql', 'select 1');
        await ws.write('Sales/Q3.md', '# Q3');
        await ws.mkdir('Empty/Nested');
        await ws.move('Sales', 'Archive/Sales');
        await ws.move('Archive/Sales/Q3.md', 'Archive/Sales/Q4.md');
        await ws.write('Old.md', 'x');
        await ws.remove('Old.md');
        await ws.remove('Empty/Nested');

        const before = sorted(useWorkspace.getState().snapshot());
        expect(before).toEqual({
            files: {'Sales.md': '# Sales', 'Archive/Sales/orders.sql': 'select 1', 'Archive/Sales/Q4.md': '# Q3'},
            dirs: ['Archive', 'Archive/Sales', 'Empty'],
        });

        await useWorkspace.getState().load(backend);
        expect(sorted(useWorkspace.getState().snapshot())).toEqual(before);
    });
});

describe('workspace store', () => {
    let backend: FolderBackend;

    beforeEach(async () => {
        backend = new FolderBackend();
        await useWorkspace.getState().load(backend);
    });

    it('writes into folders as they are spelled', async () => {
        const ws = useWorkspace.getState();
        await ws.mkdir('Sales');
        await ws.write('sales/Q3.md', '');
        expect(Object.keys(useWorkspace.getState().files)).toEqual(['Sales/Q3.md']);
    });

    it('refuses names that clash ignoring case, bad names and paths out of the root', async () => {
        const ws = useWorkspace.getState();
        await ws.write('Sales.md', '');
        await ws.write('Q3.md', '');
        expect(() => ws.move('Q3.md', 'sales.md')).toThrow('already exists');
        expect(() => ws.write('a:b.md', '')).toThrow('cannot contain');
        expect(() => ws.write('../x.md', '')).toThrow('leaves the workspace');
        expect(() => ws.write('Sales.md/x.md', '')).toThrow('is a file');
    });

    it('renames by case and refuses moving a folder into itself', async () => {
        const ws = useWorkspace.getState();
        await ws.write('Sales/Q3.md', '');
        await ws.move('Sales/Q3.md', 'Sales/q3.md');
        expect(Object.keys(useWorkspace.getState().files)).toEqual(['Sales/q3.md']);
        expect(() => ws.move('Sales', 'Sales/Inner')).toThrow('into itself');
    });

    it('takes outside changes and drops its own writes coming back', async () => {
        await useWorkspace.getState().write('Sales.md', 'mine');
        const files = useWorkspace.getState().files;
        backend.outside!('Sales.md', 'mine');
        expect(useWorkspace.getState().files).toBe(files);

        backend.outside!('Sales.md', 'theirs');
        backend.outside!('New/Page.md', 'new');
        expect(useWorkspace.getState().files).toEqual({'Sales.md': 'theirs', 'New/Page.md': 'new'});
        expect(useWorkspace.getState().dirs.has('New')).toBe(true);

        backend.outside!('Sales.md', null);
        expect(Object.keys(useWorkspace.getState().files)).toEqual(['New/Page.md']);
    });
});
