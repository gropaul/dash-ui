import React from 'react';
import {Layout, TabNode} from 'flexlayout-react';
import '@/styles/tabs.css';
import {Database, Folder, LayoutDashboard, Network, Sheet, WorkflowIcon} from 'lucide-react';
import {ConnectionsOverviewTab} from "@/components/connections/connections-overview-tab";
import {onLayoutModelChange} from "@/state/relations/layout-updates";
import {SchemaTab} from "@/components/schema/schema-tab";
import {DatabaseTab} from "@/components/database/database-tab";
import {DirectoryTab} from "@/components/directory/directory-tab";
import {DashboardTab} from "@/components/dashboard/dashboard-tab";
import {EditorOverviewTab} from "@/components/workbench/editor-overview-tab";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {NavigationBarContent, NavigationBarDesktop} from "@/components/layout/navigation-bar-desktop";
import {RelationTab} from "@/components/relation/relation-tab";
import {useGUIState} from "@/state/gui.state";
import {WorkflowTab} from "@/components/workflow/workflow-tab";
import {useIsMobile} from "@/components/provider/responsive-node-provider";
import {NavigationBarMobile} from "@/components/layout/navigation-bar-mobile";
import {cn} from "@/lib/utils";


export function TabbedLayout() {
    const layoutModel = useGUIState(state => state.layoutModel);

    const isMobile = useIsMobile();


    return (
        <div className="relative h-full w-full">
            <div className="flex flex-row h-full">
                {isMobile ?
                    <MobileLayout layoutModel={layoutModel}/>
                    :
                    <DesktopLayout layoutModel={layoutModel}/>
                }
            </div>
        </div>
    );
}

interface LayoutProps {
    layoutModel: any;
}

export function MobileLayout(props: LayoutProps) {
    const selectedTabs = useGUIState(state => state.selectedSidebarTabs);
    const setSelectedTabs = useGUIState(state => state.setSelectedSidebarTabs);
    const hasSelectedTabs = selectedTabs.length > 0;
    return <div className="flex flex-col h-full w-full">
        <div className="flex-1 min-h-0 w-full relative">
            {hasSelectedTabs ? (
                <NavigationBarContent selectedTabs={selectedTabs}/>
            ) : (
                <div className="relative h-full w-full overflow-hidden min-w-0">
                    <Layout
                        font={{size: '14px'}}
                        model={props.layoutModel}
                        factory={factory}
                        iconFactory={iconFactory}
                        onAction={onLayoutModelChange}
                        onModelChange={useGUIState.getState().persistState}
                    />
                </div>
            )}
        </div>

        {/* BOTTOM: reserve space */}
        <div className="flex-none">
            <NavigationBarMobile
                onBackButtonClick={() => setSelectedTabs([])}
                selectedTabs={selectedTabs}
                setSelectedTabs={setSelectedTabs}
            />
        </div>
    </div>
}

export function DesktopLayout(props: LayoutProps) {
    const {layoutModel} = props;

    const selectedTabs = useGUIState(state => state.selectedSidebarTabs);
    const setSelectedTabs = useGUIState(state => state.setSelectedSidebarTabs);

    let hasNonEmptyTabs = selectedTabs.length > 0;

    const panelRatio = useGUIState(state => state.mainBarSizeRatio);
    const setPanelRatio = useGUIState(state => state.setMainBarSizeRatio);

    return <>
        <NavigationBarDesktop
            selectedTabs={selectedTabs}
            setSelectedTabs={setSelectedTabs}
        />
        <ResizablePanelGroup
            className={'flex-1 h-full'}
            direction={'horizontal'}
        >
            <ResizablePanel
                defaultSize={panelRatio}
                onResize={setPanelRatio}
                minSize={8}
                style={{
                    display: hasNonEmptyTabs ? 'block' : 'none',
                }}
            >
                {<NavigationBarContent selectedTabs={selectedTabs}/>}
            </ResizablePanel>
            <ResizableHandle className={cn(hasNonEmptyTabs ? '' : 'hidden', '!cursor-col-resize')}/>
            <ResizablePanel
                defaultSize={hasNonEmptyTabs ? (100 - panelRatio) : 100}
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
                    onModelChange={useGUIState.getState().persistState}
                />
            </ResizablePanel>
        </ResizablePanelGroup>
    </>;
}


// Factory function to render components based on the component type
const factory = (node: TabNode) => {
    const component = node.getComponent();
    if (component === 'ConnectionList') {
        return <ConnectionsOverviewTab/>;
    }
    if (component === 'RelationList') {
        return <EditorOverviewTab/>;
    }
    if (component === 'RelationComponent') {
        return <RelationTab relationId={node.getConfig().relationId}/>;
    }
    if (component === 'SchemaComponent') {
        return <SchemaTab schemaId={node.getConfig().schemaId}/>;
    }
    if (component === 'DatabaseComponent') {
        return <DatabaseTab databaseId={node.getConfig().databaseId}/>;
    }
    if (component === 'DirectoryComponent') {
        return <DirectoryTab directoryId={node.getConfig().directoryId}/>;
    }
    if (component === 'DashboardComponent') {
        return <DashboardTab dashboardId={node.getConfig().dashboardId}/>;
    }
    if (component === 'WorkflowComponent') {
        return <WorkflowTab workflowId={node.getConfig().workflowId}/>;
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

    if (component === 'WorkflowComponent') {
        return <div style={{width: 16, height: 16}}>
            <WorkflowIcon size={16}/>
        </div>;
    }


    return null;
};
