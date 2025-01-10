import React from 'react';
import {Layout, TabNode} from 'flexlayout-react';
import '@/styles/tabs.css';
import {RelationView} from "@/components/relation/relation-view";
import {useRelationsState} from "@/state/relations.state";
import {Database, Folder, LayoutDashboard, Network, Sheet} from 'lucide-react';
import {ConnectionsOverview} from "@/components/connections/connections-overview";
import {onLayoutModelChange} from "@/state/relations/layout-updates";
import {SchemaView} from "@/components/schema/schema-view";
import {DatabaseView} from "@/components/database/database-view";
import {DirectoryView} from "@/components/directory/directory-view";
import {DashboardView} from "@/components/dashboard/dashboard-view";
import {EditorOverview} from "@/components/editor/editor-overview";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {AvailableTabs, NavigationBar, NavigationBarContent} from "@/components/layout/navigation-bar";
import {cn} from "@/lib/utils";


export function TabbedLayout() {
    const [selectedTabs, setSelectedTabs] = React.useState<AvailableTabs[]>(['connections', 'relations']);
    const layoutModel = useRelationsState(state => state.layoutModel);

    const hasTabs = selectedTabs.length > 0;

    return (
        <div className="relative h-full w-full">
            <div className="flex flex-row h-full">
                <NavigationBar
                    initialSelectedTabs={selectedTabs}
                    onSelectedTabsChanged={setSelectedTabs}
                />
                <ResizablePanelGroup
                    className={'flex-1 h-full'}
                    direction={'horizontal'}
                >
                    <ResizablePanel
                        defaultSize={20}
                        minSize={8}
                        className={cn(hasTabs ? '' : 'hidden', '')}
                    >
                        {hasTabs && <NavigationBarContent selectedTabs={selectedTabs}/>}
                    </ResizablePanel>
                    <ResizableHandle className={hasTabs ? '' : 'hidden'}/>
                    <ResizablePanel
                        defaultSize={hasTabs ? 80 : 100}
                        minSize={40}
                        className={'relative'}
                    >
                        <Layout
                            font={{
                                size: '14px'
                            }}
                            model={layoutModel}
                            factory={factory}
                            iconFactory={iconFactory}
                            onAction={onLayoutModelChange}
                        />
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    );
}


// Factory function to render components based on the component type
const factory = (node: TabNode) => {
    const component = node.getComponent();
    if (component === 'ConnectionList') {
        return <ConnectionsOverview/>;
    }
    if (component === 'RelationList') {
        return <EditorOverview/>;
    }
    if (component === 'RelationComponent') {
        return <RelationView relationId={node.getConfig().relationId}/>;
    }
    if (component === 'SchemaComponent') {
        return <SchemaView schemaId={node.getConfig().schemaId}/>;
    }
    if (component === 'DatabaseComponent') {
        return <DatabaseView databaseId={node.getConfig().databaseId}/>;
    }
    if (component === 'DirectoryComponent') {
        return <DirectoryView directoryId={node.getConfig().directoryId}/>;
    }
    if (component === 'DashboardComponent') {
        return <DashboardView dashboardId={node.getConfig().dashboardId}/>;
    }

    return null;
};

const iconFactory = (node: TabNode) => {
    const component = node.getComponent();
    if (component === 'RelationList') {
        return <div style={{width: 24, height: 24}}>
            <Sheet size={24} style={{transform: 'rotate(90deg)'}}/>
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

    if (component === 'DashboardComponent') {
        return <div style={{width: 16, height: 16}}>
            <LayoutDashboard size={16}/>
        </div>;
    }

    if (component === 'SchemaComponent') {
        return <div style={{width: 16, height: 16}}>
            <Network size={16}/>
        </div>;
    }

    if (component === 'DatabaseComponent') {
        return <div style={{width: 16, height: 16}}>
            <Database size={16}/>
        </div>;
    }

    if (component === 'DirectoryComponent') {
        return <div style={{width: 16, height: 16}}>
            <Folder size={16}/>
        </div>;
    }

    return null;
};
