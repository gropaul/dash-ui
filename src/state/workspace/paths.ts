/**
 * Workspace paths are posix and relative to the project root: `Sales/Q3.md`, no leading slash, no `.` or `..`.
 * Names are compared ignoring case, as on macOS and Windows.
 */

// `/` separates folders; Windows refuses the others in file names.
export const FORBIDDEN_IN_NAMES = /[/\\:*?"<>|]/;

export const samePath = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** `path` with `\` turned into `/` and empty, `.` and leading or trailing segments dropped; throws on `..`. */
export function normalizePath(path: string): string {
    const segments = path.replace(/\\/g, '/').split('/').filter(s => s !== '' && s !== '.');
    if (segments.includes('..')) throw new Error(`"${path}" leaves the workspace.`);
    return segments.join('/');
}

/** The folder holding `path`; the root is ''. */
export function parentOf(path: string): string {
    const i = path.lastIndexOf('/');
    return i < 0 ? '' : path.slice(0, i);
}

export function baseName(path: string): string {
    return path.slice(path.lastIndexOf('/') + 1);
}

/** The extension with its dot, lower case: `.md`; '' for none. */
export function extensionOf(path: string): string {
    const name = baseName(path);
    const i = name.lastIndexOf('.');
    return i <= 0 ? '' : name.slice(i).toLowerCase();
}

/** Every folder above `path`, outermost first. */
export function ancestorsOf(path: string): string[] {
    const segments = path.split('/').slice(0, -1);
    return segments.map((_, i) => segments.slice(0, i + 1).join('/'));
}

/** Whether `path` is `dir` or inside it. */
export function isWithin(path: string, dir: string): boolean {
    return samePath(path, dir) || path.toLowerCase().startsWith(dir.toLowerCase() + '/');
}

/** Where `path` ends up when `from` (it or a folder holding it) moves to `to`. */
export function movedPath(path: string, from: string, to: string): string {
    return to + path.slice(from.length);
}

/** Why `name` can't be a file or folder name, if it can't. */
export function nameError(name: string): string | undefined {
    if (!name.trim()) return 'A name is required.';
    if (FORBIDDEN_IN_NAMES.test(name)) return 'A name cannot contain / \\ : * ? " < > |';
    if (name === '.' || name === '..') return `"${name}" is not a name.`;
}

/**
 * The path `link` leads to from the file `from`: relative to its folder, or to the root with a leading `/`, as
 * links and `-- input:` paths are written. Undefined when it leaves the workspace.
 */
export function resolveRelative(from: string, link: string): string | undefined {
    const segments = link.startsWith('/') ? [] : parentOf(from).split('/').filter(Boolean);
    for (const segment of link.replace(/\\/g, '/').split('/')) {
        if (segment === '' || segment === '.') continue;
        if (segment !== '..') segments.push(segment);
        else if (!segments.pop()) return;
    }
    return segments.join('/') || undefined;
}

/** The path from the file `from`'s folder to `to`, as a link on `from` writes it. */
export function relativePath(from: string, to: string): string {
    const fromDirs = parentOf(from).split('/').filter(Boolean);
    const toSegments = to.split('/');
    let shared = 0;
    while (shared < fromDirs.length && shared < toSegments.length - 1 && samePath(fromDirs[shared], toSegments[shared])) shared++;
    return [...Array(fromDirs.length - shared).fill('..'), ...toSegments.slice(shared)].join('/');
}

/** `name` in the folder `folder`; the root is ''. */
export const joinPath = (folder: string, name: string) => folder ? `${folder}/${name}` : name;
