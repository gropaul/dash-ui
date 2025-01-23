import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import React from "react";


interface RenameDialogProps {
    title?: string;
    description?: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onDelete: () => void;
}


export function DeleteDialog(props: RenameDialogProps) {
    function handleDelete() {
        props.onDelete();
        props.onOpenChange(false);
    }

    return (
        <Dialog open={props.isOpen} onOpenChange={props.onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    {props.title && <DialogTitle>{props.title}</DialogTitle>}
                    {props.description && <DialogDescription>{props.description}</DialogDescription>}
                </DialogHeader>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => props.onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleDelete} variant={'destructive'}>
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

}