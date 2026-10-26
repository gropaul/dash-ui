// The open project's workspace folder (see dev/workspace-files.md): the renderer's workspace store loads it,
// mirrors its own changes into it, and hears about changes made outside Dash. Paths cross IPC as posix paths
// relative to the root.

const {ipcMain, dialog, BrowserWindow} = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const WORKSPACE_EXTENSIONS = ['.md', '.sql'];
const SKIPPED_DIRS = ['node_modules'];
const DEBOUNCE_MS = 100;

let root = null;
let watcher = null;
let sender = null;
const timers = new Map();
// Dash's own changes still in flight, by path; the watcher skips those paths. A finished write's echo is
// dropped by the renderer, whose store already holds that text.
const pending = new Map();

function isSkipped(rel) {
    return rel.split('/').some((segment) => segment.startsWith('.') || SKIPPED_DIRS.includes(segment));
}

function isWorkspaceFile(rel) {
    return WORKSPACE_EXTENSIONS.includes(path.extname(rel).toLowerCase());
}

function absolute(rel) {
    const abs = path.resolve(root, ...rel.split('/'));
    if (abs !== root && !abs.startsWith(root + path.sep)) throw new Error(`Outside the workspace: ${rel}`);
    return abs;
}

async function list(dir = root, prefix = '', files = {}, dirs = []) {
    for (const entry of await fs.promises.readdir(dir, {withFileTypes: true})) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (isSkipped(rel)) continue;
        if (entry.isDirectory()) {
            dirs.push(rel);
            await list(path.join(dir, entry.name), rel, files, dirs);
        } else if (entry.isFile() && isWorkspaceFile(rel)) {
            files[rel] = await fs.promises.readFile(path.join(dir, entry.name), 'utf8');
        }
    }
    return {files, dirs};
}

async function track(paths, change) {
    paths.forEach((p) => pending.set(p, (pending.get(p) ?? 0) + 1));
    try {
        await change();
    } finally {
        paths.forEach((p) => pending.set(p, pending.get(p) - 1));
    }
}

// Write to a temp file and rename it, so the watcher never reads a half-written file.
async function writeAtomic(abs, text) {
    await fs.promises.mkdir(path.dirname(abs), {recursive: true});
    const temp = path.join(path.dirname(abs), `.${path.basename(abs)}.${process.pid}.tmp`);
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
        await fs.promises.mkdir(folder, {recursive: true});
        root = path.resolve(folder);
        sender = event.sender;
        const snapshot = await list();
        watcher = fs.watch(root, {recursive: true}, (_type, filename) => onWatchEvent(filename));
        return snapshot;
    });

    ipcMain.handle('workspace:close', () => close());

    ipcMain.handle('workspace:write', (_e, rel, text) => track([rel], () => writeAtomic(absolute(rel), text)));

    ipcMain.handle('workspace:mkdir', (_e, rel) => fs.promises.mkdir(absolute(rel), {recursive: true}));

    ipcMain.handle('workspace:move', (_e, from, to) => track([from, to], async () => {
        await fs.promises.mkdir(path.dirname(absolute(to)), {recursive: true});
        await fs.promises.rename(absolute(from), absolute(to));
    }));

    ipcMain.handle('workspace:remove', (_e, rel) => track([rel], () => fs.promises.rm(absolute(rel), {recursive: true, force: true})));

    ipcMain.handle('workspace:choose-folder', async (event) => {
        const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
            properties: ['openDirectory', 'createDirectory'],
        });
        return result.canceled ? null : result.filePaths[0];
    });
}

module.exports = {initWorkspaceFs};
