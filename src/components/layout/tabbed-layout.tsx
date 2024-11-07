import React, {useEffect, useState, useRef} from 'react';
import {Action, Layout, Model, TabNode, Actions, DockLocation} from 'flexlayout-react';
import '@/styles/tabs.css';
import {RelationView} from "@/components/relation/relation-view";
import {useRelationsState} from "@/state/relations.state";
import {Database, X} from 'lucide-react';
import {ConnectionsOverview} from "@/components/connections/connections-overview";
import {Relation} from "@/model/relation";
import {IJsonTabNode} from "flexlayout-react/declarations/model/IJsonModel";
import {onLayoutModelChange} from "@/state/relations/layout-updates";


export function TabbedLayout() {

    const layoutModel = useRelationsState(state => state.layoutModel);

    return (
        <div className="relative h-full w-full">
            <Layout
                font={{
                    size: '14px'
                }}
                model={layoutModel}
                factory={factory}
                iconFactory={iconFactory}
                onAction={onLayoutModelChange}
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
    if (component === 'ConnectionList') {
        return <ConnectionsOverview/>;
    }
    if (component === 'RelationComponent') {
        return <RelationView relationId={node.getConfig().relationId}/>;
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
