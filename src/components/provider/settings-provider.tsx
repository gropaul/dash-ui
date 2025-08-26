'use client';

import React from "react";


import {SettingsDialog} from "@/components/settings/settings-dialog";
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
            <SettingsDialog
                open={settingsOpen}
                forceOpenReasons={forceOpenReasons}
                onOpenChange={setSettingsOpen}
                onSpecSave={onSpecSelected}
                initialTab={settingsTab}
            />
        </>
    );
}