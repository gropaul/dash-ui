import {Button} from "@/components/ui/button";
import {Settings} from "lucide-react";
import {TextInputConfigDialog} from "@/components/relation/text-input/text-input-config-dialog";
import SearchAutocomplete, {Suggestion} from "@/components/ui/autocomplete-input";
import {RelationViewContentProps} from "@/components/relation/relation-view-content";


export function TextField(props: RelationViewContentProps) {
    const relationId = props.relationState.id;
    const data = props.data;
    const textSearchState = props.relationState.viewState.inputTextState;

    const updateRelationValue = (s: Suggestion) => {

        const label = typeof s === "string" ? s : s.label;

        props.updateRelationViewState(relationId, {
            inputTextState: {value: label},
        });
    };

    const setShowConfig = (show: boolean) => {
        props.updateRelationViewState(relationId, {
            inputTextState: {showConfig: show},
        });
    };

    const suggestions = data?.rows.map(row => ({
        label: row[0].toString(),
        id: row[0].toString(),
    })) || []

    const suggestionsFiltered = suggestions.filter(s => {
        const value = textSearchState.value || "";
        return s.label.toLowerCase().includes(value.toLowerCase());
    });


    return (
        <>
            <div className="group pt-0.5 pb-0.5 flex flex-row gap-2 items-center justify-start">
                <SearchAutocomplete
                    suggestions={suggestionsFiltered}
                    value={textSearchState.value || ""}
                    placeholder="Search..."
                    className="flex-1"
                    onSearchTermChange={updateRelationValue}
                    onSelect={updateRelationValue}
                />
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowConfig(true)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                >
                    <Settings className="h-4 w-4" />
                </Button>
            </div>

            <TextInputConfigDialog
                isOpen={textSearchState.showConfig || false}
                onOpenChange={setShowConfig}
                {...props}
            />
        </>
    );
}
