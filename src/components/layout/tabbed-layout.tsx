// Import FlexLayout components correctly
import React from 'react';
import { Layout, Model, TabNode } from 'flexlayout-react';
import '@/styles/tabs.css';
import {RelationView} from "@/components/relation/relation-view";
import {useRelationsState} from "@/state/relations.state";
import {RelationsOverview} from "@/components/relations-overview";
import { Database } from 'lucide-react';

const TabbedLayout: React.FC = () => {

    const relationState = useRelationsState();

    const relationChildren = relationState.relations.map((relation, index) => {
        return {
            type: 'tab',
            name: relation.name,
            component: 'RelationComponent',
            config: {
                relation: relation
            }
        }
    });

    // Define the layout model using Model.fromJson
    const layoutModel = Model.fromJson({
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

                        component: 'RelationList',
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
                    children: relationChildren
                }
            ]
        }
    });


    // Factory function to render components based on the component type
    const factory = (node: TabNode) => {
        const component = node.getComponent();
        // Render based on the component identifier
        if (component === 'RelationList') {
            return <RelationsOverview/>;
        }
        if (component === 'RelationComponent') {
            return <RelationView relation={node.getConfig().relation}/>;
        }
        return null; // Return null for unrecognized components
    };

    const iconFactory = (node: TabNode) => {
        const component = node.getComponent();
        if (component === 'RelationList') {
            // rotate icon 90 degrees, make sure it is square
            return <div style={{width: 24, height: 24}}>
                <Database size={24} style={{transform: 'rotate(90deg)'}}/>
            </div>;
        }
        return null
    }

    // Use the Layout component from FlexLayout
    return (
        <Layout
            fontFamily={'Urbanist'}
            model={layoutModel}
            factory={factory}
            iconFactory={iconFactory}
        />
    );
};

export default TabbedLayout;
