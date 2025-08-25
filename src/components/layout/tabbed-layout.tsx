"use client";

import React from 'react';
import {Layout, TabNode} from 'flexlayout-react';
import '@/styles/tabs.css';
import {
    Database,
    Folder,
    LayoutDashboard,
    Network,
    Sheet,
    Menu,
    Wand2,
    Info,
    Settings,
    Download
} from 'lucide-react';
import {ConnectionsOverviewTab} from "@/components/connections/connections-overview-tab";
import {onLayoutModelChange} from "@/state/relations/layout-updates";
import {SchemaTab} from "@/components/schema/schema-tab";
import {DatabaseTab} from "@/components/database/database-tab";
import {DirectoryTab} from "@/components/directory/directory-tab";
import {DashboardTab} from "@/components/dashboard/dashboard-tab";
import {EditorOverviewTab} from "@/components/workbench/editor-overview-tab";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {NavigationBar, NavigationBarContent} from "@/components/layout/navigation-bar";
import {RelationTab} from "@/components/relation/relation-tab";
import {useGUIState} from "@/state/gui.state";
import {WorkflowTab} from "@/components/workflow/workflow-tab";
import {ChatTab} from "@/components/chat/chat-tab";
import {Avatar, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {ConnectionsService} from "@/state/connections/connections-service";
import {DuckDBWasm} from "@/state/connections/duckdb-wasm";
import {DatabaseConnection} from "@/model/database-connection";


export function TabbedLayout() {
    const layoutModel = useGUIState(state => state.layoutModel);
    const selectedTabs = useGUIState(state => state.selectedSidebarTabs);
    const setSelectedTabs = useGUIState(state => state.setSelectedSidebarTabs);
    const openSettingsTab = useGUIState(state => state.openSettingsTab);

    let hasNonEmptyTabs = selectedTabs.length > 0;

    const panelRatio = useGUIState(state => state.mainBarSizeRatio);
    const setPanelRatio = useGUIState(state => state.setMainBarSizeRatio);

    const [isMobile, setIsMobile] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<'workspace' | 'relations' | 'connections' | 'chat'>('workspace');
    const [showExport, setShowExport] = React.useState(false);

    React.useEffect(() => {
        const media = window.matchMedia('(max-width: 768px)');
        const handler = () => setIsMobile(media.matches);
        handler();
        media.addEventListener('change', handler);
        return () => media.removeEventListener('change', handler);
    }, []);

    React.useEffect(() => {
        function shouldShowExportButton(connection?: DatabaseConnection): boolean {
            if (connection) {
                return connection.type === 'duckdb-wasm-motherduck' || connection.type === 'duckdb-wasm';
            } else {
                return false;
            }
        }

        const service = ConnectionsService.getInstance();
        const update = (connection?: DatabaseConnection) => {
            setShowExport(shouldShowExportButton(connection));
        };
        service.onDatabaseConnectionChange(update);
        if (service.hasDatabaseConnection()) {
            update(service.getDatabaseConnection());
        }
    }, []);

    async function handleExportDatabase() {
        const service = ConnectionsService.getInstance();
        if (service.hasDatabaseConnection()) {
            const connection = service.getDatabaseConnection();
            const duckdb = connection as DuckDBWasm;
            await duckdb.downloadDatabase();
        }
    }

    if (isMobile) {
        function renderActive() {
            switch (activeTab) {
                case 'connections':
                    return <ConnectionsOverviewTab/>;
                case 'relations':
                    return <EditorOverviewTab onEntityOpen={() => setActiveTab('workspace')}/>;
                case 'chat':
                    return <ChatTab/>;
                case 'workspace':
                    return (
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
                    );
                default:
                    return null;
            }
        }

        return (
            <div className="flex h-full w-full flex-col">
                <div className="flex h-14 w-full items-center justify-between border-b px-4">
                    <Avatar>
                        <AvatarImage src="favicon/web-app-manifest-192x192.png" alt="Logo"/>
                    </Avatar>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant={'ghost'} size={'icon'}>
                                <Menu/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setActiveTab('workspace')}>
                                <LayoutDashboard className="mr-2 h-4 w-4"/>Workspace
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setActiveTab('relations')}>
                                <Folder className="mr-2 h-4 w-4"/>Explorer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setActiveTab('chat')}>
                                <Wand2 className="mr-2 h-4 w-4"/>Chat
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setActiveTab('connections')}>
                                <Database className="mr-2 h-4 w-4"/>Connections
                            </DropdownMenuItem>
                            {showExport && (
                                <>
                                    <DropdownMenuSeparator/>
                                    <DropdownMenuItem onClick={handleExportDatabase}>
                                        <Download className="mr-2 h-4 w-4"/>Export Database
                                    </DropdownMenuItem>
                                </>
                            )}
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem onClick={() => openSettingsTab('about')}>
                                <Info className="mr-2 h-4 w-4"/>About
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openSettingsTab('connection')}>
                                <Settings className="mr-2 h-4 w-4"/>Settings
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="flex-1 overflow-auto">
                    {renderActive()}
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full">
            <div className="flex flex-row h-full">
                <NavigationBar
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
                    <ResizableHandle className={hasNonEmptyTabs ? '' : 'hidden'}/>
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
            </div>
        </div>
    );
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

    return null;
};
