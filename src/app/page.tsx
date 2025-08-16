'use client';

import {FileDropRelation} from "@/components/import/file-drop-relation";
import {TabbedLayout} from "@/components/layout/tabbed-layout";
import React, {useEffect, useState} from "react";
import {StorageDuckAPI} from "@/state/persistency/duckdb-over-http";
import {AlertDialog} from "@radix-ui/react-alert-dialog";
import {
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {Avatar, AvatarImage} from "@/components/ui/avatar";
import {useInitState} from "@/state/init.state";


export default function Home() {
    const [showForceReloadDialog, setShowForceReloadDialog] = useState(false);

    const initComplete = useInitState(state => state.initializationComplete());

    useEffect(() => {
        StorageDuckAPI.getInstance().then((duckdb) => {
            duckdb.setOnForceReloadCallback(() => {
                setShowForceReloadDialog(true);
            });
        });
    });

    function reloadWindow() {
        window.location.reload();
    }

    if (!initComplete) {
        return <div className="h-screen w-screen flex items-center justify-center">
            <div className="flex flex-col items-center justify-center space-y-2">
                <Avatar
                    className={'mt-2'}
                >
                    <AvatarImage src="favicon/web-app-manifest-192x192.png" alt="Logo"/>
                </Avatar>

                <div className={'text-muted-foreground'}> Loading...</div>
            </div>

        </div>;
    }

    return (
        <>
            <FileDropRelation className="h-screen w-screen flex flex-col">
                <TabbedLayout/>
            </FileDropRelation>
            <AlertDialog
                open={showForceReloadDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Changes detected!</AlertDialogTitle>
                        <AlertDialogDescription>
                            Another User or Tab has made changes. To ensure you have the latest data, please reload the
                            page. Otherwise, your changes
                            may be lost.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={reloadWindow}>
                            Reload
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
