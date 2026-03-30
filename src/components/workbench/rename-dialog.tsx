import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import React from "react";
import {
    getRenameDialogDescription,
    getRenameDialogTitle,
    useRenameDialogStore
} from "@/state/rename-dialog.state";


export function RenameDialog() {
    const isOpen = useRenameDialogStore((s) => s.isOpen);
    const entityType = useRenameDialogStore((s) => s.entityType);
    const currentName = useRenameDialogStore((s) => s.currentName);
    const confirmRename = useRenameDialogStore((s) => s.confirmRename);
    const close = useRenameDialogStore((s) => s.close);

    const [newName, setNewName] = React.useState(currentName ?? '');

    React.useEffect(() => {
        setNewName(currentName ?? '');
    }, [currentName]);

    const title = getRenameDialogTitle(entityType);
    const description = getRenameDialogDescription(entityType, currentName);

    function handleRename() {
        confirmRename(newName);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        handleRename();
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) close(); }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        placeholder="Enter new name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                    />
                    <DialogFooter>
                        <Button
                            variant="secondary"
                            type="button"
                            onClick={close}
                        >
                            Cancel
                        </Button>
                        <Button type="submit">
                            Confirm
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
