// The open project's folder (see dev/workspace-files.md, dev/folder-projects.md): the renderer's workspace store
// loads it, mirrors its own changes into it, and hears about changes made outside Dash. Paths cross IPC as posix
// paths relative to the root.

const {app, ipcMain, dialog, BrowserWindow} = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const WORKSPACE_EXTENSIONS = ['.md', '.sql', '.canvas'];
const PROJECT_CONFIG_FILE = 'dash.yaml';
const SKIPPED_DIRS = ['node_modules'];
const DEBOUNCE_MS = 100;

let root = null;
let watcher = null;
let sender = null;
const timers = new Map();
// Dash's own changes still in flight, by path; the watcher skips those paths. A finished write's echo is
// dropped by the renderer, whose store already holds that text.
const pending = new Map();
// Changes run one at a time, so a later write to a file can't be overtaken by an earlier one.
let queue = Promise.resolve();

function isSkipped(rel) {
    return rel.split('/').some((segment) => segment.startsWith('.') || SKIPPED_DIRS.includes(segment));
}

function isWorkspaceFile(rel) {
    return rel === PROJECT_CONFIG_FILE || WORKSPACE_EXTENSIONS.includes(path.extname(rel).toLowerCase());
}

function absolute(rel) {
    const abs = path.resolve(root, ...rel.split('/'));
    if (abs !== root && !abs.startsWith(root + path.sep)) throw new Error(`Outside the workspace: ${rel}`);
    return abs;
}

const READ_CONCURRENCY = 32;
// Every file is read into memory when the project opens, so a bigger folder is refused instead of hanging.
const MAX_FILES = 5000;

async function walk(dir, prefix, paths, dirs) {
    const entries = await fs.promises.readdir(dir, {withFileTypes: true});
    await Promise.all(entries.map((entry) => {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (isSkipped(rel)) return undefined;
        if (entry.isDirectory()) {
            dirs.push(rel);
            return walk(path.join(dir, entry.name), rel, paths, dirs);
        }
        if (entry.isFile() && isWorkspaceFile(rel)) {
            paths.push(rel);
            if (paths.length > MAX_FILES) {
                throw new Error(`The folder has more than ${MAX_FILES} .md and .sql files; Dash opens folders up to that size for now.`);
            }
        }
        return undefined;
    }));
}

// The folders first, then the files, read in parallel; `onProgress(read, total)` follows the reading.
async function list(onProgress) {
    const paths = [];
    const dirs = [];
    await walk(root, '', paths, dirs);
    const files = {};
    let next = 0;
    let read = 0;
    const worker = async () => {
        while (next < paths.length) {
            const rel = paths[next++];
            files[rel] = await fs.promises.readFile(absolute(rel), 'utf8');
            read++;
            if (read % 50 === 0 || read === paths.length) onProgress(read, paths.length);
        }
    };
    await Promise.all(Array.from({length: READ_CONCURRENCY}, worker));
    return {files, dirs};
}

function track(paths, change) {
    paths.forEach((p) => pending.set(p, (pending.get(p) ?? 0) + 1));
    const done = () => paths.forEach((p) => pending.set(p, pending.get(p) - 1));
    const next = queue.then(change).finally(done);
    queue = next.catch(() => undefined);
    return next;
}

let tempCounter = 0;

// Write to a temp file and rename it, so the watcher never reads a half-written file.
async function writeAtomic(abs, text) {
    await fs.promises.mkdir(path.dirname(abs), {recursive: true});
    const temp = path.join(path.dirname(abs), `.${path.basename(abs)}.${process.pid}.${tempCounter++}.tmp`);
    await fs.promises.writeFile(temp, text, 'utf8');
    await fs.promises.rename(temp, abs);
}

async function readOrNull(abs) {
    try {
        return (await fs.promises.stat(abs)).isFile() ? await fs.promises.readFile(abs, 'utf8') : null;
    } catch {
        return null;
    }
}

function onWatchEvent(filename) {
    if (!filename) return;
    const rel = filename.split(path.sep).join('/');
    if (isSkipped(rel) || !isWorkspaceFile(rel)) return;
    clearTimeout(timers.get(rel));
    timers.set(rel, setTimeout(async () => {
        timers.delete(rel);
        if (!root || pending.get(rel)) return;
        const text = await readOrNull(absolute(rel));
        if (sender && !sender.isDestroyed()) sender.send('workspace:changed', rel, text);
    }, DEBOUNCE_MS));
}

function close() {
    watcher?.close();
    watcher = null;
    root = null;
    timers.forEach(clearTimeout);
    timers.clear();
    pending.clear();
}

function initWorkspaceFs() {
    ipcMain.handle('workspace:open', async (event, folder) => {
        close();
        root = path.resolve(folder);
        sender = event.sender;
        const snapshot = await list((read, total) => {
            if (!event.sender.isDestroyed()) event.sender.send('workspace:progress', read, total);
        });
        watcher = fs.watch(root, {recursive: true}, (_type, filename) => onWatchEvent(filename));
        return snapshot;
    });

    ipcMain.handle('workspace:close', () => close());

    ipcMain.handle('workspace:write', (_e, rel, text) => track([rel], () => writeAtomic(absolute(rel), text)));

    ipcMain.handle('workspace:mkdir', (_e, rel) => track([rel], () => fs.promises.mkdir(absolute(rel), {recursive: true})));

    ipcMain.handle('workspace:move', (_e, from, to) => track([from, to], async () => {
        await fs.promises.mkdir(path.dirname(absolute(to)), {recursive: true});
        await fs.promises.rename(absolute(from), absolute(to));
    }));

    ipcMain.handle('workspace:remove', (_e, rel) => track([rel], () => fs.promises.rm(absolute(rel), {recursive: true, force: true})));

    // A project folder's `dash.yaml` before the project is opened: null when there is none.
    ipcMain.handle('workspace:read-config', (_e, folder) => readOrNull(path.join(folder, PROJECT_CONFIG_FILE)));
    // Creates the folder if missing.
    ipcMain.handle('workspace:write-config', (_e, folder, text) => writeAtomic(path.join(folder, PROJECT_CONFIG_FILE), text));

    // Where new projects go unless the user picks another place; the e2e suite's storage dir when it sets one.
    ipcMain.handle('workspace:default-parent', () => process.env.DASH_STORAGE_DIR
        ? path.join(process.env.DASH_STORAGE_DIR, 'projects')
        : path.join(app.getPath('documents'), 'Dash'));

    ipcMain.handle('workspace:choose-folder', async (event) => {
        const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
            properties: ['openDirectory', 'createDirectory'],
        });
        return result.canceled ? null : result.filePaths[0];
    });
}

module.exports = {initWorkspaceFs};
