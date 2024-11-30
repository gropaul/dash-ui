import {Action, Actions, DockLocation, Model} from "flexlayout-react";
import {Relation} from "@/model/relation";
import {IJsonTabNode} from "flexlayout-react/declarations/model/IJsonModel";
import {useRelationsState} from "@/state/relations.state";
import {RelationState} from "@/model/relation-state";


interface CurrentLayoutState {
    relations: Relation[];
}

export function getInitialLayoutModel(state: CurrentLayoutState): Model {
    const relationChildren = state.relations.map(relation => getTabForRelation(relation));

    return Model.fromJson({
        global: {
            splitterSize: 1,
            splitterExtra: 8,
            enableRotateBorderIcons: false,
            enableEdgeDock: false,
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
        state.closeRelation(removedId);
    }

    return action;
}


export function focusRelationInLayout(model: Model, relationId: string): void {
    model.doAction(Actions.selectTab(relationId));
}

export function addRelationToLayout(
    model: Model,
    relation: RelationState,
): void {

    let id: string | undefined;
    // get node id from the tabset
    model.visitNodes((node) => {
        if (!id && node.getType() === 'tabset') {
            id = node.getId();
        }
    });

    if (!id) {
        console.error("No tabset found");
        return;
    }

    const relationTab = getTabForRelation(relation);
    model.doAction(Actions.addNode(relationTab, id, DockLocation.CENTER, -1));
}


function getTabForRelation(relation: Relation): IJsonTabNode {
    return {
        type: 'tab',
        name: relation.name,
        id: relation.id,
        component: 'RelationComponent',
        config: {
            relationId: relation.id,
        }
    };
}

