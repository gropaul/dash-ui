import * as React from "react"
import {RelationViewProps} from "@/components/relation/relation-view"
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog"
import {Button} from "@/components/ui/button"
import {Label} from "@/components/ui/label"
import {Input} from "@/components/ui/input"
import {InputTextViewState} from "@/model/relation-view-state/select"
import {Copy} from "lucide-react"
import {toast} from "sonner";

interface SelectConfigDialogProps extends RelationViewProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function TextInputConfigDialog(props: SelectConfigDialogProps) {
    const { relationState, updateRelationViewState } = props;
    const selectState = relationState.viewState.inputTextState;
    const relationId = relationState.id;

    function updateSelectViewState(selectState: Partial<InputTextViewState>){
        props.updateRelationViewState(relationId, {
            inputTextState: selectState,
        });
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.info("Copied to clipboard", {
            duration: 2000,
        });
    };

    const exampleQuery = `SELECT '{{${selectState.name}}}';`;
    return (
        <Dialog
            open={props.isOpen}
            onOpenChange={props.onOpenChange}
        >
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Select Configuration</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Variable Name
                        </Label>
                        <Input
                            id="name"
                            value={selectState.name}
                            onChange={(e) => updateSelectViewState({ name: e.target.value })}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="placeholder" className="text-right">
                            Placeholder
                        </Label>
                        <Input
                            id="placeholder"
                            value={selectState.placeholder}
                            onChange={(e) => updateSelectViewState({ placeholder: e.target.value })}
                            className="col-span-3"
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="current-value" className="text-right">
                            Current Value
                        </Label>
                        <Input
                            id="current-value"
                            value={selectState.value || "No value selected"}
                            className="col-span-3"
                            disabled
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="usage-example" className="text-right">
                            Usage Example
                        </Label>
                        <div className="col-span-3 relative">
                            <Input
                                id="usage-example"
                                value={exampleQuery}
                                className="font-mono"
                                disabled
                            />
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                                onClick={() => copyToClipboard(exampleQuery)}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
