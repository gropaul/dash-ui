'use client';

import React from "react";


import {SettingsDialog} from "@/components/settings/settings-dialog";
import {useGUIState} from "@/state/gui.state";
import {useInitState} from "@/state/init.state";

interface ConnectionsProviderProps {
    children: React.ReactElement<any> | React.ReactElement<any>[];
}


export default function SettingsProvider({children}: ConnectionsProviderProps) {

    const [settingsOpen, settingsTab, setSettingsOpen, setSettingsCurrentTab, forceOpenReasons] = useGUIState(state => [
        state.settings.isOpen,
        state.settings.currentTab,
        state.setSettingsOpen,
        state.setSettingsCurrentTab,
        state.settings.forceOpenReasons,
    ]);

    const onSpecSelected = useInitState(state => state.onConnectionSpecSelected);

    return (
        <>
            {children}
            <SettingsDialog
                open={settingsOpen}
                forceOpenReasons={forceOpenReasons}
                onOpenChange={setSettingsOpen}
                onSpecSave={onSpecSelected}
                activeTab={settingsTab}
                onActiveTabChange={setSettingsCurrentTab}
            />
        </>
    );
}