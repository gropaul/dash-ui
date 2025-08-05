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


interface RenameDialogProps {
    title: string;
    description?: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onRename: (newName: string) => void;
    currentName: string;
}

export function RenameDialog(props: RenameDialogProps) {
    const [newName, setNewName] = React.useState(props.currentName);

    React.useEffect(() => {
        setNewName(props.currentName);
    }, [props.currentName]);

    function handleRename() {
        props.onRename(newName);
        props.onOpenChange(false);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault(); // Prevents default form submission behavior
        handleRename();
    }

    return (
        <Dialog open={props.isOpen} onOpenChange={props.onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{props.title}</DialogTitle>
                    {props.description && <DialogDescription>{props.description}</DialogDescription>}
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
                            onClick={() => props.onOpenChange(false)}
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
