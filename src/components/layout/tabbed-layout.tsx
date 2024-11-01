import React, {useEffect, useState, useRef} from 'react';
import {Action, Layout, Model, TabNode, Actions, DockLocation} from 'flexlayout-react';
import '@/styles/tabs.css';
import {RelationView} from "@/components/relation/relation-view";
import {useRelationsState} from "@/state/relations.state";
import {RelationsOverview} from "@/components/relations-overview";
import {Database} from 'lucide-react';
import {ConnectionsOverview} from "@/components/connections/connections-overview";
import {Urbanist} from "next/font/google";
import {Relation} from "@/model/relation";
import {IJsonTabNode} from "flexlayout-react/declarations/model/IJsonModel";
import {create} from "zustand";
import {Button} from "@headlessui/react";

const urbanist = Urbanist({subsets: ["latin"]});

interface CurrentLayoutState {
    relations: Relation[];
}

const TAB_GROUP_ID_RELATIONS = 'tab-group-relations';

// Zustand store for managing the layout model
interface LayoutStore {
    model: Model;
    setModel: (newModel: Model) => void;
}

const useLayoutStore = create<LayoutStore>((set) => {
    const initialModel = getInitalModel({ relations: [] });

    return {
        model: initialModel,
        setModel: (newModel: Model) => set({ model: newModel }),
    };
});

export function TabbedLayout() {

    const { model, setModel } = useLayoutStore();

    function onLayoutChange(action: Action): Action | undefined {
        console.log(action);
        return action;
    }

    useEffect(() => {
        const unsubscribe = useRelationsState.subscribe((state) => {

            const currentRelations = state.relations;
            const displayedIds: string[] = [];
            model.visitNodes((node, level) => {
                // if the model id had a relation- prefix, it's a relation tab
                if (node.getId().startsWith('relation-')) {
                    const relationId = node.getId().replace('relation-', '');
                    displayedIds.push(relationId);
                }
            });

            console.log("Current relations", currentRelations.map(relation => relation.name));
            console.log("Displaying relations", displayedIds);


            currentRelations.forEach(relation => {
                const tab = getTabForRelation(relation);
                const action: Action = Actions.addNode(tab, TAB_GROUP_ID_RELATIONS, DockLocation.TOP, 0);

                // if the relation is already displayed, don't add it again
                if (displayedIds.includes(relation.name)) {
                    console.log("Relation already displayed", relation.name);
                    return;
                }

                console.log("Adding relation", relation.name);
                model.doAction(action);
                setModel(model);

                console.log("Model", model.toJson());
            });
        });

        return () => unsubscribe();
    }, []);

    function onButtonClicked() {
        const randomName = Math.random().toString(36).substring(7);
        const relation: Relation = {
            name: randomName,
            columns: [],
            rows: []
        };
        const tab = getTabForRelation(relation);
        const action: Action = Actions.addNode(tab, TAB_GROUP_ID_RELATIONS, DockLocation.TOP, 0);

        console.log("Adding relation", relation.name);
        model.doAction(action);

        console.log("Model", model.toJson());
    }

    return (
        <div className="h-full w-full">
            <div
                onClick={onButtonClicked}
                className="bg-gray-50 h-12 w-full flex items-center justify-center cursor-pointer z-20"
            >Add Random Relation</div>
            <div className={'h-1/3 w-full'}>
                <Layout
                    fontFamily={urbanist.className}
                    font={{
                        size: '14px'
                    }}
                    model={model}
                    factory={factory}
                    iconFactory={iconFactory}
                    onAction={onLayoutChange}
                />
            </div>
        </div>
    );
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

function getInitalModel(state: CurrentLayoutState): Model {
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
                    id: TAB_GROUP_ID_RELATIONS,
                    children: relationChildren
                }
            ],
        }
    });
}

// Factory function to render components based on the component type
const factory = (node: TabNode) => {
    const component = node.getComponent();
    if (component === 'RelationList') {
        return <RelationsOverview/>;
    }
    if (component === 'ConnectionList') {
        return <ConnectionsOverview/>;
    }
    if (component === 'RelationComponent') {
        return <RelationView relation={node.getConfig().relation}/>;
    }
    return null;
};

const iconFactory = (node: TabNode) => {
    const component = node.getComponent();
    if (component === 'RelationList') {
        return <div style={{width: 24, height: 24}}>
            <Database size={24} style={{transform: 'rotate(90deg)'}}/>
        </div>;
    }
    if (component === 'ConnectionList') {
        return <div style={{width: 24, height: 24}}>
            <Database size={24} style={{transform: 'rotate(90deg)'}}/>
        </div>;
    }
    return null;
};
