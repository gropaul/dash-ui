import React from "react";
import {exportQueryToFile, FileFormat} from "@/state/data-source/duckdb-helper";
import {FilepathDialogContentView} from "@/components/export/filepath-dialog-content-view";
import {MyDialog} from "@/components/ui/my-dialog";
import {DropdownMenu, DropdownMenuContent, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {Download} from "lucide-react";
import {HeaderDownloadButtonContent} from "@/components/relation/header/header-download-button";
import {useRelationsState} from "@/state/relations.state";
import {toast} from "sonner";


export interface FilepathDialogProps {
    state: FilepathDialogState;
    setState: (state: FilepathDialogState) => void;
}

export interface FilepathDialogState {
    open: boolean;
    relationId: string;
    fileFormat: FileFormat
}


export function FilepathDialog(props: FilepathDialogProps) {

    const {state: dialogState, setState: setDialogState} = props;

    async function onPathSelected(path: string) {
        const relation = useRelationsState.getState().getRelation(dialogState.relationId);
        const query = relation.query.baseQuery;

        // Close the dialog
        setDialogState({ ...dialogState, open: false });

        // Show exporting toast with loading indicator
        const toastId = toast.loading('Exporting file to ' + path, { duration: 0 });

        try {
            await exportQueryToFile(query, path, dialogState.fileFormat);
            // Update the same toast to success
            toast.success(`Exported result to ${path}`, { id: toastId, duration: 2000 });
        } catch (e: any) {
            // Update the same toast to error
            toast.error('Failed to export query to file: ' + e.message, { id: toastId });
        }
    }

    function onOpenChange(open: boolean) {
        setDialogState({
            ...dialogState,
            open: open,
        })
    }

    const dialogTriggerRef = React.useRef<HTMLButtonElement>(null);

    return (
        <MyDialog
            open={dialogState.open}
            onOpenChange={onOpenChange}
            className={'h-[90vh] w-[60vw] max-h-[90vh] max-w-[60vw] overflow-auto flex flex-col justify-start items-stretch space-y-1'}
        >
            <FilepathDialogContentView
                dialogTriggerRef={dialogTriggerRef}
                {...props}
            />
        </MyDialog>
    )
}
