// Open editors hand their text to the store after a short wait; anyone reading a file for an outside change
// (the agent's file tools) first flushes them, so the change applies to what is on screen.
const flushes = new Set<() => void>();

/** Registers an editor's flush; returns the unregister function. */
export function registerPendingEdits(flush: () => void): () => void {
    flushes.add(flush);
    return () => flushes.delete(flush);
}

export function flushPendingEdits() {
    flushes.forEach(flush => flush());
}
