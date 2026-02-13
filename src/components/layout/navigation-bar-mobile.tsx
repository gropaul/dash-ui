import React from "react";
import {Database, Folder, Home, Settings, Wand2} from "lucide-react";
import {AvailableTab, useGUIState} from "@/state/gui.state";
import {NavigationBarProps} from "@/components/layout/navigation-bar-desktop";

interface NavigationBarPropsMobile extends NavigationBarProps {
    onBackButtonClick?: () => void;
}

interface NavigationBarElement {
    action: () => void;
    label: string;
    icon: React.ReactNode;
}

export function NavigationBarMobile(props: NavigationBarPropsMobile) {

    // Handle tab selection change
    const handleTabChange = (values: AvailableTab[]) => {
        props.setSelectedTabs(values);
    };

    const NAV_ELEMENTS: { [key: string]: NavigationBarElement } = {
        home: {
            action: () => {
                handleTabChange([]);
            },
            label: 'Home',
            icon: <Home className="h-5 w-5"/>
        },
        relations: {
            action: () => {
                handleTabChange(['relations']);
            },
            label: 'Editor',
            icon: <Folder className="h-5 w-5"/>
        },
        connections: {
            action: () => {
                handleTabChange(['connections']);
            },
            label: 'Data Sources',
            icon: <Database className="h-5 w-5"/>
        },
        chat: {
            action: () => {
                handleTabChange(['chat']);
            },
            label: 'Chat Assistant',
            icon: <Wand2 className="h-5 w-5"/>
        },
        openSettings: {
            action: () => {
                useGUIState.getState().openSettingsTab(undefined);
            },
            label: 'Settings',
            icon: <Settings className="h-5 w-5"/>
        },
    }


    return (
        <div className={'w-full h-14 bg-background border-t border-separate flex flex-row items-center'}>
            {Object.keys(NAV_ELEMENTS).map((key) => {
                const element = NAV_ELEMENTS[key];
                let selected = false;
                if (key === 'home'){
                    selected = props.selectedTabs.length === 0;
                }else{
                    selected = props.selectedTabs.includes(key as AvailableTab);
                }
                return (
                    <div key={key}
                         className={'flex flex-1 justify-center items-center'}
                         onClick={element.action}
                         style={{
                             cursor: 'pointer',
                             color: selected ? '#3b3b40' : '#828588',

                         }}
                    >
                        {element.icon}
                    </div>
                )
            })}
        </div>
    );
}