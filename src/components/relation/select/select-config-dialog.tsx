import * as React from "react"
import { RelationViewProps } from "@/components/relation/relation-view"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { SelectViewState } from "@/model/relation-view-state/select"

interface SelectConfigDialogProps extends RelationViewProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function SelectConfigDialog(props: SelectConfigDialogProps) {
    const { relationState, updateRelationViewState } = props;
    const selectState = relationState.viewState.selectState;
    const relationId = relationState.id;

    function updateSelectViewState(selectState: Partial<SelectViewState>){
        props.updateRelationViewState(relationId, {
            selectState: selectState,
        });
    }

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
                            Name
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
                </div>
            </DialogContent>
        </Dialog>
    );
}