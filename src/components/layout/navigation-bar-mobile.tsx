import React, {Fragment} from "react";
import {ConnectionsOverviewTab} from "@/components/connections/connections-overview-tab";
import {EditorOverviewTab} from "@/components/workbench/editor-overview-tab";
import {Menu} from "lucide-react";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {Avatar, AvatarImage} from "@/components/ui/avatar";
import {AvailableTab, useGUIState} from "@/state/gui.state";
import {Button} from "@/components/ui/button";
import {ExportDatabaseButton} from "@/components/export/export-database-button";
import {ChatTab} from "@/components/chat/chat-tab";
import {NavigationBarProps} from "@/components/layout/navigation-bar-desktop";


export function NavigationBarMobile(props: NavigationBarProps) {

    const openSettingsTab = useGUIState(state => state.openSettingsTab);
    // Handle tab selection change
    const handleTabChange = (values: AvailableTab[]) => {
        props.setSelectedTabs(values);
    };

    return (
        <div className={'w-full px-2 h-14 bg-background border-b border-separate flex flex-row items-center'}>
            <Avatar>
                <AvatarImage src="favicon/web-app-manifest-192x192.png" alt="Logo"/>
            </Avatar>

            <div className={'flex-1'}/>
            <Button
                variant={'ghost'}
                size={'icon'}
                className={'mr-2'}
            >
                <Menu className="h-6 w-6"/>
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
