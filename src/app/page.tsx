'use client';

import {FileDropRelation} from "@/components/import/file-drop-relation";
import {TabbedLayout} from "@/components/layout/tabbed-layout";
import {useEffect, useState} from "react";
import {DuckDBProvider} from "@/state/persistency/duckdb";
import { AlertDialog } from "@radix-ui/react-alert-dialog";
import {
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";


export default function Home() {

    const [showForceReloadDialog, setShowForceReloadDialog] = useState(false);

    useEffect(() => {
        DuckDBProvider.getInstance().then((duckdb) => {
            duckdb.setOnForceReloadCallback(() => {
                setShowForceReloadDialog(true);
            });
        });
    });

    function reloadWindow() {
        window.location.reload();
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
                            Another User or Tab has made changes. To ensure you have the latest data, please reload the page. Otherwise, your changes
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
