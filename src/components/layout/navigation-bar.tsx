import React, {Fragment, useState} from "react";
import {ConnectionsOverviewTab} from "@/components/connections/connections-overview-tab";
import {EditorOverviewTab} from "@/components/workbench/editor-overview-tab";
import {Database, Folder, Info, Settings, Star} from "lucide-react";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {Avatar, AvatarImage} from "@/components/ui/avatar";
import {AvailableTabs, useGUIState} from "@/state/gui.state";
import {Button} from "@/components/ui/button";
import {useDatabaseConState} from "@/state/connections-database.state";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";

export interface NavigationBarProps {
    initialSelectedTabs?: AvailableTabs[];
    onSelectedTabsChanged?: (selectedTabs: AvailableTabs[]) => void;
}


export function NavigationBar(props: NavigationBarProps) {

    const [selectedTabs, setSelectedTabs] = React.useState<AvailableTabs[]>(props.initialSelectedTabs || ['connections', 'relations']);
    const [infoDialogOpen, setInfoDialogOpen] = useState(false);
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
            <Button variant={'ghost'} size={'icon'} onClick={() => setInfoDialogOpen(true)}>
                <Info />
            </Button>
            <Button variant={'ghost'} size={'icon'} onClick={() => setConnectionSettingsOpen(true)}>
                <Settings />
            </Button>

            <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-center sm:justify-start">
                            <Avatar className="h-10 w-10 mr-2">
                                <AvatarImage src="favicon/web-app-manifest-192x192.png" alt="Logo"/>
                            </Avatar>
                            <span>About Explorer</span>
                        </DialogTitle>
                        <DialogDescription>
                            <p className="py-2">
                                Explorer is an open source project for exploring and visualizing data using DuckDB.
                            </p>
                            <p className="py-2">
                                Visit our repository: <a 
                                    href="https://github.com/gropaul/dash-ui"
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline"
                                >
                                    github.com/gropaul/dash-ui
                                </a>
                            </p>
                            <div className="mt-4 p-3 bg-muted rounded-md">
                                <div className="flex items-center mb-2">
                                    <Star className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" />
                                    <p className="text-sm">
                                        If you find Dash helpful, please consider giving our repository a star on GitHub.
                                        It helps us grow and improve the project!
                                    </p>
                                </div>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
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
