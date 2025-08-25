import React, {Fragment} from "react";
import {ConnectionsOverviewTab} from "@/components/connections/connections-overview-tab";
import {EditorOverviewTab} from "@/components/workbench/editor-overview-tab";
import {Database, Folder, Info, Settings, Wand2} from "lucide-react";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {Avatar, AvatarImage} from "@/components/ui/avatar";
import {AvailableTab, useGUIState} from "@/state/gui.state";
import {Button} from "@/components/ui/button";
import {ExportDatabaseButton} from "@/components/export/export-database-button";
import {ChatTab} from "@/components/chat/chat-tab";

export interface NavigationBarProps {
    selectedTabs: AvailableTab[];
    setSelectedTabs: (selectedTabs: AvailableTab[]) => void;
}


export function NavigationBar(props: NavigationBarProps) {

    const openSettingsTab = useGUIState(state => state.openSettingsTab);
    // Handle tab selection change
    const handleTabChange = (values: AvailableTab[]) => {
        props.setSelectedTabs(values);
    };

    return (
        <div className={'w-16 py-4 h-full bg-background border-r border-separate flex flex-col items-center'}>
            <Avatar>
                <AvatarImage src="favicon/web-app-manifest-192x192.png" alt="Logo"/>
            </Avatar>

            <ToggleGroup
                type="multiple"
                className={'flex flex-col mt-4'}
                value={props.selectedTabs}
                onValueChange={handleTabChange}
            >
                <ToggleGroupItem
                    size={'lg'}
                    className={'mb-2'}
                    value="relations"
                    aria-label="Toggle Relations"
                >
                    <Folder className="h-10 w-10"/>
                </ToggleGroupItem>
                <ToggleGroupItem
                    size={'lg'}
                    className={'mb-2'}
                    value="connections"
                    aria-label="Toggle Connection"
                >
                    <Database className="h-10 w-10"/>
                </ToggleGroupItem>
                <ToggleGroupItem
                    size={'lg'}
                    className={'mb-2'}
                    value="chat"
                    aria-label="Toggle Chat"
                >
                    <Wand2 className="h-10 w-10"/>
                </ToggleGroupItem>
            </ToggleGroup>
            <div className={'flex-1'}/>

            <ExportDatabaseButton/>
            <div className={'h-2'}/>

            <Button variant={'ghost'} size={'icon'} onClick={() => {
                openSettingsTab('about');
            }}>
                <Info/>
            </Button>
            <div className={'h-2'}/>
            <Button variant={'ghost'} size={'icon'} onClick={() => {
                openSettingsTab('connection');
            }}>
                <Settings/>
            </Button>
        </div>
    );
}


interface NavigationBarContentProps {
    selectedTabs: AvailableTab[];
}

export function NavigationBarContent(props: NavigationBarContentProps) {
    const sideBarTabsRatios = useGUIState(state => state.sideBarTabsSizeRatios);
    const setSideBarTabsRatios = useGUIState(state => state.setSideBarTabsSizeRatios);

    // Ensure ratios array has correct length
    React.useEffect(() => {
        if (!Array.isArray(sideBarTabsRatios) || sideBarTabsRatios.length !== props.selectedTabs.length) {
            const defaultRatio = Math.floor(100 / props.selectedTabs.length);
            setSideBarTabsRatios(Array(props.selectedTabs.length).fill(defaultRatio));
        }
    }, [props.selectedTabs.length]);

    function renderTabContent(tab: AvailableTab) {
        switch (tab) {
            case 'connections':
                return <ConnectionsOverviewTab/>;
            case 'relations':
                return <EditorOverviewTab/>;
            case 'chat':
                return <ChatTab/>;
        }
    }

    function handleResize(index: number, size: number) {
        const updated = [...sideBarTabsRatios];
        updated[index] = size;
        setSideBarTabsRatios(updated);
    }

    const allTabs = ['relations', 'connections', 'chat'] as const;

    return (
        <div className="flex-1 h-screen overflow-auto">
            <ResizablePanelGroup direction="vertical">
                {allTabs.map((tab, index) => (
                    <Fragment key={`panel-group-${tab}`}>
                        {index > 0 && true && <ResizableHandle
                            style={{display: props.selectedTabs.includes(tab) ? 'block' : 'none'}}
                        />}
                        <ResizablePanel
                            style={{
                                overflow: 'auto',
                                display: props.selectedTabs.includes(tab) ? 'block' : 'none'
                            }}
                            minSize={15}
                            onResize={(size) => handleResize(index, size)}
                            defaultSize={sideBarTabsRatios[index] ?? Math.floor(100 / props.selectedTabs.length)}
                        >
                            {renderTabContent(tab)}
                        </ResizablePanel>
                    </Fragment>
                ))}
            </ResizablePanelGroup>
        </div>
    );
}
