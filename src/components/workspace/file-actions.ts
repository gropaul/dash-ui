import {toast} from "sonner";
import {useWorkspace} from "@/state/workspace/workspace.state";
import {useFileStats} from "@/state/workspace/file-stats.state";
import {useProjectsState} from "@/state/projects.state";
import {useGUIState} from "@/state/gui.state";
import {DashLocations, DashNavigator} from "@/state/routing/navigation";
import {baseName, extensionOf, isWithin, joinPath, movedPath, nameError, parentOf, samePath} from "@/state/workspace/paths";
import {displayName, isQuery, kindOf} from "@/state/workspace/workspace-tree";
import {sanitizeMacroName} from "@/platform/sql-utils";
import {askForName} from "@/components/workspace/name-dialog";
import {rewriteReferences} from "@/state/workspace/rewrite-references";
import {queryByName, queryName, usersOutside} from "@/state/workspace/file-references";
import {RelationSource} from "@/model/relation";
import {getBaseQueryFromSource} from "@/model/relation-state";
import {nameForSource} from "@/state/workspace/query-files";
import {confirmDelete} from "@/components/workspace/delete-file-dialog";
import {formatCanvas} from "@/state/workspace/canvas-text";

export type NewFileKind = 'page' | 'query' | 'canvas' | 'folder';

const projectId = () => useProjectsState.getState().currentProjectId;

/** A query's file name is an identifier, as in dbt: `Busiest stations` is saved as `busiest_stations.sql`. */
function queryFileName(name: string) {
    return `${sanitizeMacroName(name)}.sql`;
}

/** The file name `name` makes for a new item of `kind`, or one with `extension` when renamed. */
function fileName(name: string, extension: string) {
    return extension === '.sql' ? queryFileName(name) : name + extension;
}

/**
 * Why `name` can't become the file name `path` (in place of `current`, when renaming), if it can't. Query names are
 * identifiers and unique in the whole project.
 */
function validate(name: string, path: string, current?: string): string | undefined {
    if (isQuery(path) && !sanitizeMacroName(name)) return 'A query name needs a letter or digit.';
    const error = nameError(baseName(path));
    if (error) return error;
    const {files, dirs} = useWorkspace.getState();
    const other = (p?: string) => p && (!current || !samePath(p, current)) ? p : undefined;
    const taken = other([...Object.keys(files), ...dirs].find(p => samePath(p, path)));
    if (taken) return `"${baseName(taken)}" is already in this folder.`;
    const query = isQuery(path) ? other(queryByName(files, queryName(path))) : undefined;
    if (query) return `A query named ${queryName(query)} already exists at ${query}.`;
}

export function newFile(kind: NewFileKind, folder: string = '') {
    const extension = {page: '.md', query: '.sql', canvas: '.canvas', folder: ''}[kind];
    const pathFor = (name: string) => joinPath(folder, fileName(name, extension));
    askForName({
        title: {page: 'New Page', query: 'New Query', canvas: 'New Canvas', folder: 'New Folder'}[kind],
        savedAs: name => kind === 'query' ? queryFileName(name) : undefined,
        validate: name => validate(name, pathFor(name)),
        onSubmit: async name => {
            const ws = useWorkspace.getState();
            if (kind === 'folder') return ws.mkdir(pathFor(name));
            await ws.write(pathFor(name), {page: `# ${name}\n`, query: '', canvas: formatCanvas([{id: 'title', type: 'text', x: 0, y: 0, width: 400, height: 80, attributes: {'text-style': 'h1', 'text-align': 'left'}, body: name}])}[kind]);
            DashNavigator.instance().navigateToPath(pathFor(name));
        },
    });
}

/**
 * Moves a file or folder, following it if it is open. The links, `-- input:` paths and `refs` calls of the other
 * files that point into it are rewritten to match (rewrite-references.ts).
 */
export async function moveEntry(from: string, to: string) {
    const nav = DashNavigator.instance();
    const shown = nav.getCurrentPath();
    const ws = useWorkspace.getState();
    const rewritten = rewriteReferences(ws.files, from, to);
    // Everything that follows the move changes in one go, so nothing shows the half-moved state; the saving after.
    const saving = [ws.move(from, to), ...Object.entries(rewritten).map(([path, text]) => ws.write(path, text))];
    useFileStats.getState().move(projectId(), from, to);
    moveOpenFolders(from, to);
    if (shown && isWithin(shown, from)) nav.navigateToPath(movedPath(shown, from, to), true);
    await Promise.all(saving);
}

/** The folders open in the file tree at or inside `from`, open at their new place. */
function moveOpenFolders(from: string, to: string) {
    const id = projectId();
    useGUIState.setState(s => {
        const open = s.workspaceTreeOpen[id];
        if (!open?.some(dir => isWithin(dir, from))) return {};
        return {workspaceTreeOpen: {...s.workspaceTreeOpen, [id]: open.map(dir => isWithin(dir, from) ? movedPath(dir, from, to) : dir)}};
    });
}

/** Picks a folder, or the top level, in the command palette and moves the file or folder there. */
export function moveEntryTo(path: string) {
    useGUIState.getState().openCommand({
        action: 'move',
        filter: ['folder'],
        includeTopLevel: true,
        // Not into itself, and not where it already is.
        exclude: folder => isWithin(folder.path, path) || folder.path === parentOf(path),
        onSelect: async folder => {
            try {
                await moveEntry(path, joinPath(folder.path, baseName(path)));
                if (folder.path) useGUIState.getState().setWorkspaceFolderOpen(projectId(), folder.path, true);
            } catch (e) {
                toast.error((e as Error).message);
            }
        },
    });
}

export function renameEntry(path: string) {
    const extension = kindOf(path) === 'file' || kindOf(path) === 'sources' ? '' : extensionOf(path);
    const pathFor = (name: string) => joinPath(parentOf(path), fileName(name, extension));
    const users = isQuery(path) ? usersOutside(useWorkspace.getState().files, path) : [];
    askForName({
        title: 'Rename',
        description: users.length ? `Its refs are renamed in:\n${users.join('\n')}` : undefined,
        initial: displayName(path),
        submitLabel: 'Rename',
        savedAs: name => isQuery(path) ? queryFileName(name) : undefined,
        validate: name => validate(name, pathFor(name), path),
        onSubmit: name => moveEntry(path, pathFor(name)),
    });
}

export function deleteEntry(path: string) {
    const {files, dirs} = useWorkspace.getState();
    const isFolder = dirs.has(path);
    const users = usersOutside(files, path);
    confirmDelete({
        title: isFolder ? 'Delete folder' : 'Delete file',
        description: `Delete "${path}"${isFolder ? ' and everything in it' : ''}? This can't be undone.`
            + (users.length ? `\n\nThese files use it and will show it as not found:\n${users.join('\n')}` : ''),
        onDelete: () => removeEntry(path),
    });
}

/** Deletes a file or folder, leaving it if it is open. */
export async function removeEntry(path: string) {
    const nav = DashNavigator.instance();
    const shown = nav.getCurrentPath();
    await useWorkspace.getState().remove(path);
    useFileStats.getState().remove(projectId(), path);
    if (shown && isWithin(shown, path)) nav.navigateToLocation(DashLocations.CurrentProjectRoot(), true);
}

export function copyLink(path: string) {
    navigator.clipboard.writeText(window.location.origin + DashNavigator.instance().getUrlFromPath(path)).then(
        () => toast.success('Link copied', {duration: 2000}),
        () => toast.error('Could not copy the link'),
    );
}

/** Asks for a name and saves `sql` as a new query at the top level, e.g. a table found in the catalog. */
export function saveAsQuery(initialName: string, sql: string) {
    askForName({
        title: 'Save as query',
        initial: sanitizeMacroName(initialName),
        submitLabel: 'Save',
        savedAs: queryFileName,
        validate: name => validate(name, queryFileName(name)),
        onSubmit: async name => {
            await useWorkspace.getState().write(queryFileName(name), sql);
            DashNavigator.instance().navigateToPath(queryFileName(name));
        },
    });
}

export function saveSourceAsQuery(source: RelationSource) {
    saveAsQuery(nameForSource(source), getBaseQueryFromSource(source));
}
