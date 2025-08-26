import React, {Fragment} from "react";
import {ArrowLeft, Info, Menu, X} from "lucide-react";
import {AvailableTab, useGUIState} from "@/state/gui.state";
import {Button} from "@/components/ui/button";
import {NavigationBarProps} from "@/components/layout/navigation-bar-desktop";

interface NavigationBarPropsMobile extends NavigationBarProps {
    onBackButtonClick?: () => void;
}


export function NavigationBarMobile(props: NavigationBarPropsMobile) {

    const [menuOpen, setMenuOpen] = React.useState(false);
    const openSettingsTab = useGUIState(state => state.openSettingsTab);
    // Handle tab selection change
    const handleTabChange = (values: AvailableTab[]) => {
        props.setSelectedTabs(values);
    };

    // this means we have the data view with the dashboard, editor, etc.
    const onMainPage = props.selectedTabs.length === 0;

    // actions and callback functions map and also has the lable
    const actions: { [key: string]: [() => void, string] } = {
        openSettings: [() => openSettingsTab(undefined), 'Settings'],
        about: [() => openSettingsTab('about'), 'About Dash'],

        toggleMenu: [() => setMenuOpen(!menuOpen), 'Toggle Menu'],
    }


    return (
        <div className={'w-full h-14 bg-background border-b border-separate flex flex-row items-center'}>

            {!onMainPage &&
                <Button
                    variant={'ghost'}
                    size={'icon'}
                    className={'ml-2'}
                    onClick={props.onBackButtonClick}
                >
                    <ArrowLeft/>
                </Button>
            }

            <div className={'flex-1'}/>
            <Button
                variant={'ghost'}
                size={'icon'}
                className={'mr-2'}
                onClick={() => setMenuOpen(!menuOpen)}
            >
                <Menu className="h-6 w-6"/>
            </Button>
            {menuOpen &&
                <div className={'absolute top-0 left-0 w-full h-full z-50 bg-background border-b border-separate flex flex-col items-center '}>
                    { Object.keys(actions).map((actionKey) => {
                        const [action, label] = actions[actionKey];
                        return (
                            <Fragment key={actionKey}>
                                <Button
                                    variant={'ghost'}
                                    size={'icon'}
                                    className={'m-2'}
                                    onClick={() => {
                                        action();
                                        setMenuOpen(false);
                                    }}
                                >
                                    {actionKey === 'openSettings' && <Info className="h-6 w-6"/>}
                                    {actionKey === 'toggleMenu' && <X className="h-6 w-6"/>}
                                </Button>
                                <div className={'text-sm'}>{label}</div>
                            </Fragment>
                        );
                    })}
                </div>
            }
        </div>
    );
}