import {DropdownMenuCheckboxItem, DropdownMenuLabel} from "@/components/ui/dropdown-menu";
import {Input} from "@/components/ui/input";
import {RelationSettingsProps} from "@/components/relation/relation-settings";

export function TextInputSettingsContent(props: RelationSettingsProps) {
    const selectState = props.relationState.viewState.inputTextState;
    const multiSelect = selectState.multiSelect !== false; // defaults to true

    return (
        <>
            <DropdownMenuLabel>Select Settings</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
                checked={multiSelect}
                onCheckedChange={(checked) => props.updateRelationViewState({inputTextState: {multiSelect: checked}})}
            >
                Multi Select
            </DropdownMenuCheckboxItem>
            <div className="px-2 py-1.5">
                <Input
                    value={selectState.name}
                    onChange={(e) => props.updateRelationViewState({inputTextState: {name: e.target.value}})}
                    placeholder="Variable name"
                    className="h-8 text-sm"
                />
            </div>
        </>
    );
}
