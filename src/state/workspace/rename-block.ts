import {humanizeName} from "@/platform/string-utils";
import {renameRefCalls} from "@/platform/sql-refs";
import {pageOfSurface, surfacesOfPage, useSurfaces} from "@/state/workspace/surfaces.state";
import {useRelationDataState} from "@/state/relations-data.state";

/**
 * What is in memory for a block of a page or canvas renamed to `name`, `relationId` its surface key: its pick, run
 * and result move to the key of its new name, and the refs calls to it in the SQL the file's other blocks last ran
 * follow their text, so a re-run before their next edit doesn't call the old name. The file's text is the caller's.
 */
export function renameBlockSurfaces(relationId: string, name: string) {
    const file = pageOfSurface(relationId);
    if (!file) return;
    const from = relationId.slice(file.length + 1);
    const id = `${file}#${name}`;

    const surfaces = useSurfaces.getState();
    const previous = surfaces.relations[relationId];
    if (previous) {
        const viewParameters = structuredClone(previous.query.viewParameters);
        const oldTitle = humanizeName(from);
        if (viewParameters.chart && viewParameters.chart.plot.title === oldTitle) viewParameters.chart.plot.title = humanizeName(name);
        if (viewParameters.select && viewParameters.select.label === oldTitle) viewParameters.select.label = humanizeName(name);
        const data = useRelationDataState.getState().getData(relationId);
        if (data) useRelationDataState.getState().updateData(id, data);
        surfaces.set({...previous, id, viewState: {...previous.viewState, displayName: name}, query: {...previous.query, viewParameters}});
        surfaces.remove(relationId);
    }

    for (const relation of Object.values(surfacesOfPage(file))) {
        const activeBaseQuery = renameRefCalls(relation.query.activeBaseQuery, from.toLowerCase(), name);
        if (activeBaseQuery !== relation.query.activeBaseQuery) {
            useSurfaces.getState().set({...relation, query: {...relation.query, activeBaseQuery}});
        }
    }
}
