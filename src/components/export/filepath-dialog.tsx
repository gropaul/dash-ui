import React from "react";
import {FileFormat} from "@/state/connections/duckdb-helper";
import {FilepathDialogContentView} from "@/components/export/filepath-dialog-content-view";
import {MyDialog} from "@/components/ui/my-dialog";


export interface FilepathDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children?: React.ReactNode;
    basePath?: string;
    fileFormat: FileFormat
    onFilePathSelected?: (path: string) => void;
}

export function FilepathDialog(props: FilepathDialogProps) {

    const dialogTriggerRef = React.useRef<HTMLButtonElement>(null);

    return (
        <MyDialog
            open={props.open}
            onOpenChange={props.onOpenChange}
            className={'h-[90vh] w-[60vw] max-h-[90vh] max-w-[60vw] overflow-auto flex flex-col justify-start items-stretch space-y-1'}
        >
            <FilepathDialogContentView
                dialogTriggerRef={dialogTriggerRef}
                {...props}
            />
        </MyDialog>
    )
}
