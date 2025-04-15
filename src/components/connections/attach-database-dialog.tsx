import {Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {useState} from "react";

export interface DialogResult {
    url: string;
}

interface AttachDatabaseDialogProps {
    onClose: () => void;
    onSubmit: (result: DialogResult) => void;
    isOpen: boolean;
}

export function AttachDatabaseDialog(props: AttachDatabaseDialogProps) {
    const {onClose, onSubmit, isOpen} = props;
    const [state, setState] = useState<DialogResult>({
        url: '',
    });

    const handleSubmit = () => {
        if (state.url.trim() === '') {
            alert("Please enter a valid URL.");
            return;
        }
        onSubmit(state);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Attach Database</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <Input
                        type="text"
                        placeholder="Enter database URL"
                        value={state.url}
                        onChange={(e) => setState({url: e.target.value})}
                    />
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                        Submit
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}