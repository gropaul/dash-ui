import {useRelationDataState} from "@/state/relations-data.state";
import {listCachedIds} from "@/state/relations-data/functions";
import {fileOfSurface, pageOfSurface, useSurfaces} from "@/state/workspace/surfaces.state";
import {blockNamesOf} from "@/state/workspace/page-text";
import {useWorkspace} from "@/state/workspace/workspace.state";

/** Whether the surface is still in the files: its query, or a block its page still names. */
function exists(surface: string, files: Record<string, string>) {
    const file = fileOfSurface(surface);
    if (!(file in files)) return false;
    return !pageOfSurface(surface) || blockNamesOf(files[file]).has(surface.slice(file.length + 1).toLowerCase());
}

async function dropCacheTables(drop: (surface: string) => boolean) {
    for (const id of await listCachedIds()) {
        if (drop(id)) await useRelationDataState.getState().deleteData(id);
    }
}

/**
 * What goes with a file, beyond the workspace store: the cache tables and in-memory state of its query or blocks,
 * named by their surface keys (dev/workspace-files.md).
 */
export const ContentLifecycle = {
    /**
     * At project load: drops every cache table whose query or block is gone. Unnamed blocks are keyed by node ids
     * that last only while a page is open, so their tables go too.
     */
    async onProjectLoad(files: Record<string, string>) {
        await dropCacheTables(id => !exists(id, files));
    },

    /** Drops what goes with each file as it leaves the workspace, deleted or moved, until the returned function is called. */
    followRemovedFiles(): () => void {
        return useWorkspace.subscribe((state, previous) => {
            if (state.files === previous.files) return;
            const removed = new Set(Object.keys(previous.files).filter(path => !(path in state.files)));
            if (removed.size === 0) return;
            const surfaces = useSurfaces.getState();
            Object.keys(surfaces.relations).filter(id => removed.has(fileOfSurface(id))).forEach(surfaces.remove);
            void dropCacheTables(id => removed.has(fileOfSurface(id)));
        });
    },
};
