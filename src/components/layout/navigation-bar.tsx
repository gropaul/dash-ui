import React, {Fragment, useState} from "react";
import {ConnectionsOverviewTab} from "@/components/connections/connections-overview-tab";
import {EditorOverviewTab} from "@/components/workbench/editor-overview-tab";
import {Database, Folder, Info, Settings, Star, Wand2} from "lucide-react";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {Avatar, AvatarImage} from "@/components/ui/avatar";
import {AvailableTabs, useGUIState} from "@/state/gui.state";
import {Button} from "@/components/ui/button";
import {useDatabaseConState} from "@/state/connections-database.state";
import {ExportDatabaseButton} from "@/components/export/export-database-button";
import {SettingsView} from "@/components/settings/settings-view";
import {Chat} from "@/components/chat/chat";

export interface NavigationBarProps {
    initialSelectedTabs?: AvailableTabs[];
    onSelectedTabsChanged?: (selectedTabs: AvailableTabs[]) => void;
}


export function NavigationBar(props: NavigationBarProps) {

    const [selectedTabs, setSelectedTabs] = React.useState<AvailableTabs[]>(props.initialSelectedTabs || ['connections', 'relations']);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'about' | 'connection'>('about');
    const [setConnectionSettingsOpen, connectionSettingsOpen] = useDatabaseConState(state => [
        state.setConnectionsConfigOpen,
        state.connectionsConfigOpen
    ]);
    // Handle tab selection change
    const handleTabChange = (value: string[]) => {
        setSelectedTabs(value as AvailableTabs[]);
        if (props.onSelectedTabsChanged) {
            props.onSelectedTabsChanged(value as AvailableTabs[]);
        }
    };

    return (
        <div className={'w-16 py-4 h-full bg-background border-r border-separate flex flex-col items-center'}>
            <Avatar>
                <AvatarImage src="favicon/web-app-manifest-192x192.png" alt="Logo"/>
            </Avatar>

            <ToggleGroup
                type="multiple"
                className={'flex flex-col mt-4'}
                value={selectedTabs}
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
                    value="chat"
                    aria-label="Toggle Chat"
                >
                    <Wand2 className="h-10 w-10"/>
                </ToggleGroupItem>
                <ToggleGroupItem
                    size={'lg'}
                    className={'mb-2'}
                    value="connections"
                    aria-label="Toggle Connection"
                >
                    <Database className="h-10 w-10"/>
                </ToggleGroupItem>
            </ToggleGroup>
            <div className={'flex-1'}/>

            <ExportDatabaseButton />
            <div className={'h-2'}/>

            <Button variant={'ghost'} size={'icon'} onClick={() => {
                setSettingsTab('about');
                setSettingsOpen(true);
            }}>
                <Info />
            </Button>
            <div className={'h-2'}/>
            <Button variant={'ghost'} size={'icon'} onClick={() => {
                setSettingsTab('connection');
                setSettingsOpen(true);
            }}>
                <Settings />
            </Button>

            {/* Only show the settings view if the connection settings dialog is not open */}
            {!connectionSettingsOpen && (
                <SettingsView
                    open={settingsOpen}
                    onOpenChange={setSettingsOpen}
                    initialTab={settingsTab}
                    onSpecSave={(spec) => {
                        // This will be handled by the ConnectionsProvider
                        setConnectionSettingsOpen(true);
                        setSettingsOpen(false);
                    }}
                />
            )}
        </div>
    );
}


interface NavigationBarContentProps {
    selectedTabs: AvailableTabs[];
}

export function NavigationBarContent(props: NavigationBarContentProps) {

    const sideBarTabsRatio = useGUIState(state => state.sideBarTabsSizeRatio);
    const setSideBarTabsRatio = useGUIState(state => state.setSideBarTabsSizeRatio);

    function renderTabContent(tab: AvailableTabs) {
        switch (tab) {
            case 'connections':
                return <ConnectionsOverviewTab/>;
            case 'relations':
                return <EditorOverviewTab/>;
            case 'chat':
                return <Chat/>;
        }
    }

    return (
        <div className={'flex-1 h-screen overflow-auto'}>
            <ResizablePanelGroup direction={'vertical'}>
                {props.selectedTabs.toSorted().reverse().map((tab, index) => (
                    <Fragment key={`panel-group-${tab}`}>
                        {index > 0 && <ResizableHandle />}
                        <ResizablePanel
                            style={{ overflow: 'auto' }}
                            minSize={20}
                            onResize={size => setSideBarTabsRatio(size)}
                            defaultSize={index === 1 ? sideBarTabsRatio : 100 - sideBarTabsRatio}
                        >
                            {renderTabContent(tab)}
                        </ResizablePanel>
                    </Fragment>
                ))}
            </ResizablePanelGroup>
        </div>
    )
}
