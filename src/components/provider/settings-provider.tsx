'use client';

import React from "react";


import {SettingsView} from "@/components/settings/settings-view";
import {useGUIState} from "@/state/gui.state";
import {useInitState} from "@/state/init.state";

interface ConnectionsProviderProps {
    children: React.ReactElement | React.ReactElement[];
}


export default function SettingsProvider({children}: ConnectionsProviderProps) {

    const [settingsOpen, settingsTab, setSettingsOpen, forceOpenReasons] = useGUIState(state => [
        state.settings.isOpen,
        state.settings.currentTab,
        state.setSettingsOpen,
        state.settings.forceOpenReasons,
    ]);

    const onSpecSelected = useInitState(state => state.onConnectionSpecSelected);

    return (
        <>
            {children}
            <SettingsView
                open={settingsOpen}
                forceOpenReasons={forceOpenReasons}
                onOpenChange={setSettingsOpen}
                onSpecSave={onSpecSelected}
                initialTab={settingsTab}
            />
        </>
    );
}