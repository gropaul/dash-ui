import React from "react";
import {ConnectionsOverview} from "@/components/connections/connections-overview";
import {EditorOverview} from "@/components/editor/editor-overview";
import {Database, Sheet} from "lucide-react";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";

export interface NavigationBarProps {
    initialSelectedTabs?: AvailableTabs[];
    onSelectedTabsChanged?: (selectedTabs: AvailableTabs[]) => void;
}

export type AvailableTabs = 'connections' | 'relations';

export function NavigationBar(props: NavigationBarProps) {
    const [selectedTabs, setSelectedTabs] = React.useState<AvailableTabs[]>(props.initialSelectedTabs || ['connections', 'relations']);

    // Handle tab selection change
    const handleTabChange = (value: string[]) => {
        setSelectedTabs(value as AvailableTabs[]);
        if (props.onSelectedTabsChanged) {
            props.onSelectedTabsChanged(value as AvailableTabs[]);
        }
    };

    return (
        <div className={'w-fit h-full bg-background border-r border-separate flex flex-col items-center'}>

            <Avatar className={'mt-2'}>
                <AvatarImage src="logo/logo.png" alt="Logo"/>
                <AvatarFallback>CN</AvatarFallback>
            </Avatar>

            <ToggleGroup
                type="multiple"
                className={'flex flex-col p-2'}
                value={selectedTabs}
                onValueChange={handleTabChange}
            >
                <ToggleGroupItem
                    value="connections"
                    aria-label="Toggle Connection"
                >
                    <Database className="h-8 w-8"/>
                </ToggleGroupItem>
                <ToggleGroupItem
                    value="relations"
                    aria-label="Toggle Relations"
                >
                    <Sheet className="h-8 w-8"/>
                </ToggleGroupItem>
            </ToggleGroup>
        </div>
    );
}


interface NavigationBarContentProps {
    selectedTabs: AvailableTabs[];
}

export function NavigationBarContent(props: NavigationBarContentProps) {

    function renderTabContent(tab: AvailableTabs) {
        switch (tab) {
            case 'connections':
                return <ConnectionsOverview/>;
            case 'relations':
                return <EditorOverview/>;
        }
    }

    return (
        <div className={'flex-1 h-screen overflow-auto'}>
            <ResizablePanelGroup direction={'vertical'}>
                {props.selectedTabs.toSorted().map((tab, index) => (
                    <>
                        {index > 0 && <ResizableHandle/>}
                        <ResizablePanel
                            style={{overflow: 'auto'}}
                            key={index}
                            defaultSize={50}
                            minSize={20}
                        >
                            {renderTabContent(tab)}
                        </ResizablePanel>

                    </>
                ))}
            </ResizablePanelGroup>
        </div>
    )
}