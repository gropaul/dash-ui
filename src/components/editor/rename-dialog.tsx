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

    // listen for changes in the currentName prop
    React.useEffect(() => {
        setNewName(props.currentName);
    }, [props.currentName]);

    function handleRename() {
        props.onRename(newName);
        props.onOpenChange(false);
    }

    return (
        <Dialog open={props.isOpen} onOpenChange={props.onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{props.title}</DialogTitle>
                    {props.description && <DialogDescription>{props.description}</DialogDescription>}
                </DialogHeader>

                <div className="space-y-4">
                    <Input
                        placeholder="Enter new name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => props.onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleRename}>
                        Confirm
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

}