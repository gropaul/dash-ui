import {useWorkspace} from "@/state/workspace/workspace.state";
import {flushPendingEdits} from "@/state/workspace/pending-edits";
import {normalizePath} from "@/state/workspace/paths";
import {moveEntry, removeEntry} from "@/components/workspace/file-actions";

/** `text` with `oldText` replaced by `newText`; `oldText` must occur exactly once, so a stale edit fails. */
export function applyEdit(text: string, oldText: string, newText: string): string {
    if (!oldText) throw new Error('old_text is empty.');
    const count = text.split(oldText).length - 1;
    if (count === 0) throw new Error('old_text is not in the file; read it again.');
    if (count > 1) throw new Error(`old_text occurs ${count} times; include more of the text around it.`);
    return text.replace(oldText, () => newText);
}

// Each operation first takes in what open editors still hold, so it works on the text on screen.

function currentText(path: string): string {
    flushPendingEdits();
    const text = useWorkspace.getState().files[normalizePath(path)];
    if (text === undefined) throw new Error(`"${path}" doesn't exist.`);
    return text;
}

/** The workspace's folders (ending in /) and files, one per line. */
export function listFiles(): string {
    const {files, dirs} = useWorkspace.getState();
    return [...[...dirs].map(dir => dir + '/'), ...Object.keys(files)].sort().join('\n');
}

export function readFile(path: string): string {
    return currentText(path);
}

export async function editFile(path: string, oldText: string, newText: string) {
    await useWorkspace.getState().write(normalizePath(path), applyEdit(currentText(path), oldText, newText));
}

export async function writeFile(path: string, text: string) {
    flushPendingEdits();
    await useWorkspace.getState().write(path, text);
}

export async function moveFile(from: string, to: string) {
    flushPendingEdits();
    await moveEntry(from, to);
}

export async function deleteFile(path: string) {
    await removeEntry(path);
}
