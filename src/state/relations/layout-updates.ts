import {Model, Actions, DockLocation} from "flexlayout-react";
import {Relation} from "@/model/relation";
import {IJsonTabNode} from "flexlayout-react/declarations/model/IJsonModel";
import {RelationViewState} from "@/state/relations.state";


interface CurrentLayoutState {
    relations: Relation[];
}

export function getInitialModel(state: CurrentLayoutState): Model {
    const relationChildren = state.relations.map(relation => getTabForRelation(relation));

    const model = Model.fromJson({
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

    model.close
    return model;
}


export function addRelationToLayout(
    model: Model,
    relation: RelationViewState,
    removeRelation: (relation: RelationViewState) => void
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
    relationTab.setEventListener('close', () => {

    });
    model.doAction(Actions.addNode(relationTab, id, DockLocation.CENTER, -1));
}


function getTabForRelation(relation: Relation): IJsonTabNode {
    return {
        type: 'tab',
        name: relation.name,
        id: `relation-${relation.name}`,
        component: 'RelationComponent',
        config: {
            relation: relation
        }
    };
}

