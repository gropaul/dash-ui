// Import FlexLayout components correctly
import React from 'react';
import { Layout, Model, TabNode } from 'flexlayout-react';
import '@/styles/tabs.css';
import {RelationView} from "@/components/relation/relation-view";
import {getTestRelation} from "@/model/relation";
import {FileDrop} from "@/components/base/input/file-drop";
import {Tmp} from "@/components/tmp";
import {useRelationsState} from "@/state/relations.state";
import {RelationListView} from "@/components/relation-list-view";

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
            enableEdgeDock: false,
        },
        borders: [],
        layout: {
            type: 'row',
            children: [
                {
                    type: 'tabset',
                    weight: 30,
                    selected: 0,
                    children: [
                        {
                            type: 'tab',
                            name: 'Relations',
                            component: 'TextComponent',
                            config: {
                                text: 'List of Relations'
                            }
                        },
                    ]
                },
                {
                    type: 'tabset',
                    weight: 70,
                    children: relationChildren
                }
            ]
        }
    });


    // Factory function to render components based on the component type
    const factory = (node: TabNode) => {
        const component = node.getComponent();
        // Render based on the component identifier
        if (component === 'TextComponent') {
            return <div><Tmp/><RelationListView/></div>;
        }
        if (component === 'RelationComponent') {
            return <RelationView relation={node.getConfig().relation}/>;
        }
        return null; // Return null for unrecognized components
    };

    // Use the Layout component from FlexLayout
    return (
        <Layout model={layoutModel} factory={factory} />
    );
};

export default TabbedLayout;
