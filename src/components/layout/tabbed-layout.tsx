import React from 'react';
import {Layout, TabNode} from 'flexlayout-react';
import '@/styles/tabs.css';
import {RelationView} from "@/components/relation/relation-view";
import {useRelationsState} from "@/state/relations.state";
import {Database, Network, Sheet} from 'lucide-react';
import {ConnectionsOverview} from "@/components/connections/connections-overview";
import {onLayoutModelChange} from "@/state/relations/layout-updates";
import {SchemaView} from "@/components/schema/schema-view";


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


// Factory function to render components based on the component type
const factory = (node: TabNode) => {
    const component = node.getComponent();
    if (component === 'ConnectionList') {
        return <ConnectionsOverview/>;
    }
    if (component === 'RelationComponent') {
        return <RelationView relationId={node.getConfig().relationId}/>;
    }
    if (component === 'SchemaComponent') {
        return <SchemaView schemaId={node.getConfig().schemaId}/>;
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
    if (component === 'RelationComponent') {
        return <div style={{width: 16, height: 16}}>
            <Sheet size={16}/>
        </div>;
    }

    if (component === 'SchemaComponent') {
        return <div style={{width: 16, height: 16}}>
            <Network size={16}/>
        </div>;
    }

    return null;
};
