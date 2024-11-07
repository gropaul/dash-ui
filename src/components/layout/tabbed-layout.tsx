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


export function TabbedLayout() {

    const layoutModel = useRelationsState(state => state.layoutModel);


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
                model={layoutModel}
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
