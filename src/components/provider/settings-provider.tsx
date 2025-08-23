'use client';

import React, {useEffect, useState} from "react";


import {SettingsView} from "@/components/settings/settings-view";
import {useGUIState} from "@/state/gui.state";
import {useInitState} from "@/state/init.state";
import {ConnectionsService} from "@/state/connections/connections-service";

interface ConnectionsProviderProps {
    children: React.ReactElement | React.ReactElement[];
}


export interface ConnectionStateActive {
    state: "active";
    conName: string;
    singleTabOnly: boolean;
}

export interface ConnectionStateInactive {
    state: "inactive";
}

export type ConnectionState = ConnectionStateActive | ConnectionStateInactive;

export default function SettingsProvider({children}: ConnectionsProviderProps) {

    const [settingsOpen, settingsTab, setSettingsOpen, forceOpenReasons] = useGUIState(state => [
        state.settings.isOpen,
        state.settings.currentTab,
        state.setSettingsOpen,
        state.settings.forceOpenReasons,
    ]);

    const [connectionState, setConnectionState] = useState<ConnectionState>({state: "inactive"});
    const connName = connectionState.state === "active" ? connectionState.conName : "none";

    useEffect(() => {
        ConnectionsService.getInstance().onDatabaseConnectionChange((connection) => {
            if (connection) {
                setConnectionState({
                    state: "active",
                    conName: connection.type,
                    singleTabOnly: !connection.canHandleMultiTab(),
                });
            } else {
                setConnectionState({state: "inactive"});
            }
        });
    });

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
            <div>
                {connectionState.state === "inactive" && (
                    <div className="fixed bottom-4 right-4 z-50">
                        <div
                            className="bg-red-600 text-white px-4 py-2 rounded shadow-lg cursor-pointer"
                        >
                            No Active Connection - Click to Connect
                        </div>
                    </div>
                )}
                {connectionState.state === "active" && (
                    <div className="fixed bottom-4 right-4 z-50">
                        <div
                            className="bg-yellow-600 text-white px-4 py-2 rounded shadow-lg cursor-pointer"
                        >
                            Connection to {connectionState.conName} Active. It
                            is {connectionState.singleTabOnly ? "single-tab" : "multi-tab"} only.
                            <div/>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
