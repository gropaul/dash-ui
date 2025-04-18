import React, {Fragment} from "react";
import {ConnectionsOverviewTab} from "@/components/connections/connections-overview-tab";
import {EditorOverviewTab} from "@/components/workbench/editor-overview-tab";
import {Database, Folder, Settings} from "lucide-react";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {Avatar, AvatarImage} from "@/components/ui/avatar";
import {AvailableTabs, useGUIState} from "@/state/gui.state";
import {Button} from "@/components/ui/button";
import {useDatabaseConState} from "@/state/connections-database.state";

export interface NavigationBarProps {
    initialSelectedTabs?: AvailableTabs[];
    onSelectedTabsChanged?: (selectedTabs: AvailableTabs[]) => void;
}


export function NavigationBar(props: NavigationBarProps) {

    const [selectedTabs, setSelectedTabs] = React.useState<AvailableTabs[]>(props.initialSelectedTabs || ['connections', 'relations']);
    const setConnectionSettingsOpen = useDatabaseConState(state => state.setConnectionsConfigOpen);
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
                    value="connections"
                    aria-label="Toggle Connection"
                >
                    <Database className="h-10 w-10"/>
                </ToggleGroupItem>
                <ToggleGroupItem
                    size={'lg'}
                    value="relations"
                    aria-label="Toggle Relations"
                >
                    <Folder className="h-10 w-10"/>
                </ToggleGroupItem>
            </ToggleGroup>
            <div className={'flex-1'}/>
            <Button variant={'ghost'} size={'icon'} onClick={() => setConnectionSettingsOpen(true)}>
                <Settings />
            </Button>
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
                            minSize={30}
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