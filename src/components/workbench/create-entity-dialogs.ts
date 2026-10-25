import {useRenameDialogStore} from "@/state/rename-dialog.state";
import {useRelationsState} from "@/state/relations.state";
import {RelationActions} from "@/state/relations/actions/static-actions";
import {MAIN_CONNECTION_ID} from "@/platform/global-data";
import {getInitDashboardState} from "@/model/dashboard-state";
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
        useRelationsState.getState().addNewDashboard(MAIN_CONNECTION_ID, path, getInitDashboardState(name));
    });
}

/** The page of the folder at `folderPath`: beside it, named like it, Sales.md for Sales/. */
export function createFolderPage(folderPath: string[], folderName: string) {
    useRelationsState.getState().addNewDashboard(MAIN_CONNECTION_ID, folderPath.slice(0, -1), getInitDashboardState(folderName));
}

export function openCreateFolderDialog(path: string[] = [], tree?: TreeNode) {
    useRenameDialogStore.getState().openCreateDialog('folder', (name) => {
        const actions = AddFolderActions(path, tree, name);
        useRelationsState.getState().applyEditorElementsActions(actions);
    });
}
