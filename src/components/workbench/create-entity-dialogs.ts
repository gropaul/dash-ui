import {useRenameDialogStore} from "@/state/rename-dialog.state";
import {useRelationsState} from "@/state/relations.state";
import {RelationActions} from "@/state/relations/actions/static-actions";
import {MAIN_CONNECTION_ID} from "@/platform/global-data";
import {getInitDashboardViewState} from "@/model/dashboard-state";
import {GetInitialCanvasState} from "@/model/canvas-state";
import {getRandomId} from "@/platform/id-utils";
import {AddFolderActions} from "@/components/basics/files/tree-action-utils";
import {TreeNode} from "@/components/basics/files/tree-utils";

export function openCreateRelationDialog(path: string[] = []) {
    useRenameDialogStore.getState().openCreateDialog('relations', (name) => {
        const relation = RelationActions.create({showCode: true});
        useRelationsState.getState().addNewRelation(
            MAIN_CONNECTION_ID,
            path,
            {...relation, viewState: {...relation.viewState, displayName: name}}
        );
    });
}

export function openCreateDashboardDialog(path: string[] = []) {
    useRenameDialogStore.getState().openCreateDialog('dashboards', (name) => {
        const randomId = `dashboard-${getRandomId()}`;
        useRelationsState.getState().addNewDashboard(MAIN_CONNECTION_ID, path, {
            id: randomId,
            name: name,
            viewState: getInitDashboardViewState(name),
            elementState: {
                blocks: [{id: getRandomId(), type: 'header', data: {text: name, level: 1}}]
            }
        });
    });
}

export function openCreateCanvasDialog(path: string[] = []) {
    useRenameDialogStore.getState().openCreateDialog('canvas', (name) => {
        const canvas = GetInitialCanvasState();
        useRelationsState.getState().addNewCanvas(
            {...canvas, viewState: {...canvas.viewState, displayName: name}},
            path
        );
    });
}

export function openCreateFolderDialog(path: string[] = [], tree?: TreeNode) {
    useRenameDialogStore.getState().openCreateDialog('folder', (name) => {
        const actions = AddFolderActions(path, tree, name);
        useRelationsState.getState().applyEditorElementsActions(actions);
    });
}
