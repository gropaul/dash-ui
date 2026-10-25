import {useMemo} from "react";
import {createWithEqualityFn} from "zustand/traditional";
import {WorkspaceBackend, WorkspaceSnapshot} from "@/state/workspace/workspace-backend";
import {ancestorsOf, baseName, isWithin, movedPath, nameError, normalizePath, parentOf, samePath} from "@/state/workspace/paths";
import {buildWorkspaceTree} from "@/state/workspace/workspace-tree";

/**
 * The project's files, the working copy in both runtimes. The app reads and edits this store; each change
 * goes to the store first, synchronously, then to the backend: the returned promise is the saving. See
 * dev/workspace-files.md.
 */
interface WorkspaceState {
    files: Record<string, string>;
    /** Every folder, including those only implied by a file's path. */
    dirs: Set<string>;

    load(backend: WorkspaceBackend): Promise<void>;
    /** Empties the store and detaches it from its backend, when a project closes. */
    unload(): void;
    write(path: string, text: string): Promise<void>;
    mkdir(path: string): Promise<void>;
    /** Moves or renames a file or a folder with its contents. */
    move(from: string, to: string): Promise<void>;
    remove(path: string): Promise<void>;
    /** A change made outside Dash; `text` is null for a removed file. */
    applyOutside(path: string, text: string | null): void;
    snapshot(): WorkspaceSnapshot;
}

let backend: WorkspaceBackend | undefined;

// The changes apply to the store at once (and throw at once when they can't); the promise is only the saving.
const persist = (saving: Promise<void> | undefined) => saving ?? Promise.resolve();
let stopWatching: (() => void) | undefined;

function withAncestors(dirs: Set<string>, path: string) {
    const next = new Set(dirs);
    ancestorsOf(path).forEach(dir => next.add(dir));
    return next;
}

export const useWorkspace = createWithEqualityFn<WorkspaceState>()((set, get) => {

    /** The existing file or folder at `path`, ignoring case. */
    function find(path: string): string | undefined {
        const {files, dirs} = get();
        if (path in files || dirs.has(path)) return path;
        return [...Object.keys(files), ...dirs].find(p => samePath(p, path));
    }

    /** `path` normalized, its folders spelled as they exist; throws when a file stands where a folder must. */
    function resolve(path: string): string {
        const normalized = normalizePath(path);
        if (!normalized) throw new Error('A path is required.');
        let resolved = '';
        for (const segment of normalized.split('/')) {
            const error = nameError(segment);
            if (error) throw new Error(error);
            const next = resolved ? `${resolved}/${segment}` : segment;
            resolved = find(next) ?? next;
        }
        for (const dir of ancestorsOf(resolved)) {
            if (dir in get().files) throw new Error(`"${dir}" is a file, not a folder.`);
        }
        return resolved;
    }

    return {
        files: {},
        dirs: new Set(),

        async load(next) {
            stopWatching?.();
            backend = next;
            const {files, dirs} = await next.load();
            const all = new Set(dirs);
            Object.keys(files).forEach(path => ancestorsOf(path).forEach(dir => all.add(dir)));
            set({files, dirs: all});
            stopWatching = next.watch?.((path, text) => get().applyOutside(path, text));
        },

        unload() {
            stopWatching?.();
            stopWatching = backend = undefined;
            set({files: {}, dirs: new Set()});
        },

        write(path, text) {
            const target = resolve(path);
            if (get().dirs.has(target)) throw new Error(`"${target}" is a folder.`);
            set(state => ({files: {...state.files, [target]: text}, dirs: withAncestors(state.dirs, target)}));
            return persist(backend?.write(target, text));
        },

        mkdir(path) {
            const target = resolve(path);
            if (target in get().files) throw new Error(`"${target}" is a file.`);
            set(state => ({dirs: withAncestors(state.dirs, target).add(target)}));
            return persist(backend?.mkdir(target));
        },

        move(path, toPath) {
            const from = find(normalizePath(path));
            if (!from) throw new Error(`"${path}" doesn't exist.`);
            // The folders of the target as they exist; its own name as given, so a rename can change case.
            const parent = parentOf(normalizePath(toPath));
            const to = (parent ? resolve(parent) + '/' : '') + baseName(normalizePath(toPath));
            const error = nameError(baseName(to));
            if (error) throw new Error(error);
            if (from === to) return persist(undefined);
            const taken = find(to);
            if (taken && !samePath(taken, from)) throw new Error(`"${taken}" already exists.`);
            if (isWithin(to, from) && !samePath(to, from)) throw new Error(`"${from}" can't move into itself.`);
            if (to in get().files || ancestorsOf(to).some(dir => dir in get().files)) throw new Error(`"${to}" is a file.`);

            set(state => {
                const files: Record<string, string> = {};
                for (const [p, text] of Object.entries(state.files)) files[isWithin(p, from) ? movedPath(p, from, to) : p] = text;
                const dirs = withAncestors(new Set([...state.dirs].map(d => isWithin(d, from) ? movedPath(d, from, to) : d)), to);
                return {files, dirs};
            });
            return persist(backend?.move(from, to));
        },

        remove(path) {
            const target = find(normalizePath(path));
            if (!target) return persist(undefined);
            set(state => ({
                files: Object.fromEntries(Object.entries(state.files).filter(([p]) => !isWithin(p, target))),
                dirs: new Set([...state.dirs].filter(d => !isWithin(d, target))),
            }));
            return persist(backend?.remove(target));
        },

        applyOutside(path, text) {
            const {files} = get();
            if (text === null) {
                if (!(path in files)) return;
                const next = {...files};
                delete next[path];
                set({files: next});
                return;
            }
            // Our own write coming back.
            if (files[path] === text) return;
            set(state => ({files: {...state.files, [path]: text}, dirs: withAncestors(state.dirs, path)}));
        },

        snapshot() {
            const {files, dirs} = get();
            return {files, dirs: [...dirs]};
        },
    };
});

export function useFile(path: string): string | undefined {
    return useWorkspace(s => s.files[path]);
}

/** The paths of the workspace's files, not their texts: typing in a file doesn't change them. */
export function useFilePaths(): string[] {
    const key = useWorkspace(s => Object.keys(s.files).join('\n'));
    return useMemo(() => key ? key.split('\n') : [], [key]);
}

export function useWorkspaceTree() {
    const paths = useFilePaths();
    const dirs = useWorkspace(s => s.dirs);
    return useMemo(() => buildWorkspaceTree(paths, dirs), [paths, dirs]);
}

// E2E-only, like __projectsStore: lets a test await an edit reaching the files.
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_E2E === '1') {
    (window as unknown as { __workspaceStore?: typeof useWorkspace }).__workspaceStore = useWorkspace;
}
