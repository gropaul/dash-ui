import {DropdownMenuCheckboxItem, DropdownMenuLabel} from "@/components/ui/dropdown-menu";
import {Input} from "@/components/ui/input";
import {RelationSettingsProps} from "@/components/relation/relation-settings";
import {ViewManager} from "@/model/relation-state/relation-view";

export function SelectSettingsContent(props: RelationSettingsProps) {
    const selectQueryParameters = ViewManager.instance.select.getQueryParameters(props.relationState)
    const multiSelect = selectQueryParameters.multiSelect !== false; // defaults to true

    return (
        <>
            <DropdownMenuLabel>Select Settings</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
                checked={multiSelect}
                onCheckedChange={(checked) => props.updateRelationQueryParams({
                    select: {
                        ...selectQueryParameters,
                        multiSelect: checked
                    }
                })}
            >
                Multi Select
            </DropdownMenuCheckboxItem>
        </>
    );
}