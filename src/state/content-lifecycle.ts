import {RelationState} from "@/model/relation-state";
import {DashboardState} from "@/model/dashboard-state";
import {EditorFolder} from "@/model/editor-folder";
import {RelationEvents} from "@/state/relations/event/relation-events";
import {useRelationDataState} from "@/state/relations-data.state";
import {listCachedIds} from "@/state/relations-data/functions";

/** The project as it was before a change; page blocks resolve their `input` against it. */
interface ProjectSnapshot {
    editorElements: EditorFolder[];
    relations: Record<string, RelationState>;
    dashboards: Record<string, DashboardState>;
}

// Loaded on demand: the page editor's modules import the relations store, which imports this.
const pageTables = () => import("@/components/page-editor/page-tables");

/**
 * What happens outside the relations store when project content goes away: the delete event and the cache
 * tables. Every delete path calls these, before it changes the store.
 */
export const ContentLifecycle = {
    onQueryDelete(relation: RelationState) {
        RelationEvents.delete(relation);
        void useRelationDataState.getState().deleteData(relation.id);
    },

    onPageDelete(page: DashboardState, before: ProjectSnapshot) {
        void pageTables().then(m => m.deletePageTables(page.markdown ?? '', page.id, before.editorElements, before.relations));
    },

    /**
     * Drops the cache tables of queries and page blocks that no longer exist. A block's id changes with its
     * SQL and settings, so each edit leaves the previous version's table behind until this runs.
     */
    async onProjectLoad(project: ProjectSnapshot) {
        const {pageBlockIds} = await pageTables();
        const live = new Set(Object.keys(project.relations));
        for (const page of Object.values(project.dashboards)) {
            pageBlockIds(page.markdown ?? '', page.id, project.editorElements, project.relations).forEach(id => live.add(id));
        }
        for (const id of await listCachedIds()) {
            if (!live.has(id)) await useRelationDataState.getState().deleteData(id);
        }
    },
};
