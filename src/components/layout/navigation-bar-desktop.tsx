import React from "react";
import {ConnectionsOverviewTab} from "@/components/connections/connections-overview-tab";
import {EditorOverviewTab} from "@/components/workbench/editor-overview-tab";
import {BookOpen, Database, Folder, Info, Settings, Star, Wand2} from "lucide-react";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {Avatar, AvatarImage} from "@/components/ui/avatar";
import {AvailableTab, useGUIState} from "@/state/gui.state";
import {Button} from "@/components/ui/button";
import {ExportDatabaseButton} from "@/components/export/export-database-button";
import {ChatTab} from "@/components/chat/chat-tab";
import {useIsMobile} from "@/components/provider/responsive-node-provider";

export interface NavigationBarProps {
    selectedTabs: AvailableTab[];
    setSelectedTabs: (selectedTabs: AvailableTab[]) => void;
}


export function NavigationBarDesktop(props: NavigationBarProps) {

    const openSettingsTab = useGUIState(state => state.openSettingsTab);
    // Handle tab selection change
    const handleTabChange = (values: AvailableTab[]) => {
        props.setSelectedTabs(values);
    };

    return (
        <div className={'w-16 py-4 h-full bg-muted-background border-r border-separate flex flex-col items-center'}>
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


            <a href="https://github.com/gropaul/dash" target="_blank" rel="noopener noreferrer">
                <Button variant={'ghost'} size={'icon'}>
                    <Star/>
                </Button>
            </a>
            <div className={'h-2'}/>
            <ExportDatabaseButton/>
            <div className={'h-2'}/>

            <Button variant={'ghost'} size={'icon'} onClick={() => {
                openSettingsTab('documentation');
            }}>                <BookOpen/>
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


const ALL_TABS = ['relations', 'connections', 'chat'] as const;
const TAB_ORDER: Record<AvailableTab, number> = {relations: 0, connections: 1, chat: 2};

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

interface NavigationBarContentProps {
    selectedTabs: AvailableTab[];
}

export function NavigationBarContent(props: NavigationBarContentProps) {
    const isMobile = useIsMobile();
    const actualSelectedTabs = isMobile ? props.selectedTabs.slice(0, 1) : props.selectedTabs;
    const visibleTabs = ALL_TABS.filter(tab => actualSelectedTabs.includes(tab));
    const defaultSize = visibleTabs.length > 0 ? Math.floor(100 / visibleTabs.length) : 100;

    return (
        <div className="flex-1 h-full overflow-auto">
            <ResizablePanelGroup direction="vertical" autoSaveId="sidebar-panels">
                {visibleTabs.map((tab, index) => (
                    <React.Fragment key={tab}>
                        {index > 0 && <ResizableHandle className="!cursor-row-resize"/>}
                        <ResizablePanel
                            id={tab}
                            order={TAB_ORDER[tab]}
                            style={{overflow: 'auto', minHeight: 50}}
                            defaultSize={defaultSize}
                        >
                            {renderTabContent(tab)}
                        </ResizablePanel>
                    </React.Fragment>
                ))}
            </ResizablePanelGroup>
        </div>
    );
}
