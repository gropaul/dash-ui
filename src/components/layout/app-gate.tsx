'use client';

import React, {useEffect, useState} from "react";
import {FileDropRelation} from "@/components/import/file-drop-relation";
import {AppShell} from "@/components/layout/app-shell";
import {RenameDialog} from "@/components/workbench/rename-dialog";
import {GlobalCommand} from "@/components/workbench/global-command";
import {RelationDeleteDialog} from "@/components/workbench/relation-delete-dialog";
import {StorageDuckAPI} from "@/state/persistency/duckdb-storage";
import {AlertDialog} from "@radix-ui/react-alert-dialog";
import {
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {Avatar, AvatarImage} from "@/components/ui/avatar";
import {useInitState} from "@/state/init.state";

/**
 * Hosts the one-time init gate + global dialogs, ABOVE the router so they are
 * mounted once and never remount on client navigation. The routed page is
 * `children`, rendered inside the shell once initialization completes.
 */
export function AppGate({children}: { children: React.ReactNode }) {
    const [showForceReloadDialog, setShowForceReloadDialog] = useState(false);
    const [mounted, setMounted] = useState(false);
    const initComplete = useInitState((state) => state.initializationComplete());
    const label = useInitState((state) => state.getCurrentStepLabel());

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        StorageDuckAPI.getInstance().then((duckdb) => {
            duckdb.setOnForceReloadCallback(() => setShowForceReloadDialog(true));
        });
    });

    if (!initComplete) {
        return (
            <div className="h-[100dvh] w-full flex items-center justify-center">
                <div className="flex flex-col items-center justify-center space-y-2">
                    <Avatar className="mt-2">
                        <AvatarImage src="favicon/web-app-manifest-192x192.png" alt="Logo"/>
                    </Avatar>
                    <div className="text-muted-foreground">Loading...</div>
                    <div className="text-muted-foreground">{mounted ? label : " "}</div>
                </div>
            </div>
        );
    }

    return (
        <>
            <FileDropRelation className="h-[100dvh] w-full flex flex-col">
                <AppShell>{children}</AppShell>
            </FileDropRelation>
            <AlertDialog open={showForceReloadDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Changes detected!</AlertDialogTitle>
                        <AlertDialogDescription>
                            Another User or Tab has made changes. To ensure you have the latest data, please reload the
                            page. Otherwise, your changes may be lost.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => window.location.reload()}>Reload</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <RenameDialog/>
            <GlobalCommand/>
            <RelationDeleteDialog/>
        </>
    );
}
