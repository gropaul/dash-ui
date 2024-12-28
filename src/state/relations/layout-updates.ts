import {Action, Actions, DockLocation, Model} from "flexlayout-react";
import {Relation} from "@/model/relation";
import {IJsonTabNode} from "flexlayout-react/declarations/model/IJsonModel";
import {useRelationsState} from "@/state/relations.state";
import {RelationState} from "@/model/relation-state";
import {DataSourceGroup} from "@/model/connection";
import {DirectoryNormalizedState} from "@/model/directory-normalized";


interface CurrentLayoutState {
    relations: Relation[];
}

export function getInitialLayoutModel(state: CurrentLayoutState): Model {
    const relationChildren = state.relations.map(relation => getTabForRelation(relation));

    return Model.fromJson({
        global: {
            splitterSize: 1,
            splitterExtra: 8,
            enableRotateBorderIcons: true,
            enableEdgeDock: false,
            tabIcon: 'relation',
        },
        borders: [
            {
                type: 'border',
                location: 'left',
                size: 256,
                barSize: 48,
                enableDrop: false,
                selected: 0,
                children: [
                    {
                        type: 'tab',
                        enableClose: false,
                        enableRename: false,
                        enableDrag: false,
                        name: '',
                        component: 'ConnectionList',
                    }
                ]
            }
        ],
        layout: {
            type: 'row',
            children: [
                {
                    type: 'tabset',
                    tabStripHeight: 32,
                    children: relationChildren,
                }
            ],
        }
    });
}


export function onLayoutModelChange(action: Action): Action | undefined {

    // get relations state
    const state = useRelationsState.getState();

    if (action.type === "FlexLayout_DeleteTab") {
        const removedId = action.data.node;
        state.closeTab(removedId);
    }

    return action;
}


export function focusTabById(model: Model, relationId: string): void {
    model.doAction(Actions.selectTab(relationId));
}

export function addDatabaseToLayout(
    model: Model,
    databaseId: string,
    database: DataSourceGroup,
): void {
    const tabSetId = getDefaultTabSetId(model);
    if (!tabSetId) {
        throw new Error("No tabset found");
    }

    const databaseTab = getTabForDatabase(databaseId, database.name);
    model.doAction(Actions.addNode(databaseTab, tabSetId, DockLocation.CENTER, -1));
}

export function addDirectoryToLayout(
    model: Model,
    directoryId: string,
    directory: DirectoryNormalizedState,
): void {
    const tabSetId = getDefaultTabSetId(model);
    if (!tabSetId) {
        throw new Error("No tabset found");
    }

    const directoryTab = getTabForDirectory(directoryId, directory.dir.name);
    model.doAction(Actions.addNode(directoryTab, tabSetId, DockLocation.CENTER, -1));
}

export function addSchemaToLayout(
    model: Model,
    schemaId: string,
    schema: DataSourceGroup,
): void {
    const tabSetId = getDefaultTabSetId(model);
    if (!tabSetId) {
        throw new Error("No tabset found");
    }

    const schemaTab = getTabForSchema(schemaId, schema.name);
    model.doAction(Actions.addNode(schemaTab, tabSetId, DockLocation.CENTER, -1));
}

export function addRelationToLayout(
    model: Model,
    relation: RelationState,
): void {

    const tabSetId = getDefaultTabSetId(model);
    if (!tabSetId) {
        throw new Error("No tabset found");
    }

    const relationTab = getTabForRelation(relation);
    model.doAction(Actions.addNode(relationTab, tabSetId, DockLocation.CENTER, -1));
}


function getDefaultTabSetId(model: Model): string | undefined {
    let id: string | undefined;
    // get node id from the tabset
    model.visitNodes((node) => {
        if (!id && node.getType() === 'tabset') {
            id = node.getId();
        }
    });

    if (!id) {
        console.error("No tabset found");
        return undefined
    }

    return id;
}

function getTabForDirectory(directoryId: string, directoryName: string): IJsonTabNode {
    return {
        type: 'tab',
        name: directoryName,
        id: directoryId,
        component: 'DirectoryComponent',
        config: {
            directoryId: directoryId,
        },
    };
}

function getTabForDatabase(databaseId: string, databaseName: string): IJsonTabNode {
    return {
        type: 'tab',
        name: databaseName,
        id: databaseId,
        component: 'DatabaseComponent',
        config: {
            databaseId: databaseId,
        },
    };
}

function getTabForSchema(schemaId: string, schemaName: string): IJsonTabNode {
    return {
        type: 'tab',
        name: schemaName,
        id: schemaId,
        component: 'SchemaComponent',
        config: {
            schemaId: schemaId,
        },
    };

}

function getTabForRelation(relation: Relation): IJsonTabNode {
    return {
        type: 'tab',
        name: relation.name,
        id: relation.id,
        component: 'RelationComponent',
        config: {
            relationId: relation.id,
        },
    };
}

