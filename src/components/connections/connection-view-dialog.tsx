import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {ConnectionView} from "@/components/connections/connection-view";
import {ConnectionConfig} from "@/components/connections/connection-config";


export interface ConnectionViewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ConnectionViewDialog(props: ConnectionViewDialogProps) {
    return (
        <Dialog open={props.open} onOpenChange={props.onOpenChange}>
            <DialogContent className={'flex flex-col'}>
                <DialogHeader>
                    <DialogTitle>Configure DuckDB Connection</DialogTitle>
                    <DialogDescription>
                        Configure how you would like to use DuckDB.
                    </DialogDescription>
                </DialogHeader>
                <ConnectionConfig/>
            </DialogContent>
        </Dialog>
    )
}