import React, {useEffect, useState, useRef} from 'react';
import {Action, Layout, Model, TabNode, Actions, DockLocation} from 'flexlayout-react';
import '@/styles/tabs.css';
import {RelationView} from "@/components/relation/relation-view";
import {useRelationsState} from "@/state/relations.state";
import {RelationsOverview} from "@/components/relations-overview";
import {Database, X} from 'lucide-react';
import {ConnectionsOverview} from "@/components/connections/connections-overview";
import {Relation} from "@/model/relation";
import {IJsonTabNode} from "flexlayout-react/declarations/model/IJsonModel";

interface CurrentLayoutState {
    relations: Relation[];
}

const TAB_GROUP_ID_RELATIONS = 'tab-group-relations';

export function TabbedLayout() {

    const relationsState = useRelationsState();
    const model = getModel({relations: relationsState.relations});

    function onLayoutChange(action: Action): Action | undefined {
        console.log(action);
        return action;
    }

    return (
        <div className="h-full w-full relative">
            <Layout
                font={{
                    size: '14px'
                }}
                model={model}
                factory={factory}
                iconFactory={iconFactory}
                onAction={onLayoutChange}
            />
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

function getModel(state: CurrentLayoutState): Model {
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
