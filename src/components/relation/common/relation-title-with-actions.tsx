import {Pencil} from "lucide-react";
import {Button} from "@/components/ui/button";
import {MacroCopyButton} from "@/components/relation/macro-copy-button";
import {RelationExecutionInfo} from "@/components/relation/common/relation-execution-info";
import {RelationState} from "@/model/relation-state";
import {useRenameDialogStore} from "@/state/rename-dialog.state";

export interface RelationTitleWithActionsProps {
    relationState: RelationState;
    updateRelation: (newRelation: RelationState) => void;
    className?: string;
    executionInfoClassName?: string;
}

/**
 * Shared component for relation title with edit and copy macro buttons.
 * Used in both the relation view header and workflow canvas header.
 * Shows edit and copy buttons on hover.
 */
export function RelationTitleWithActions({
                                             relationState,
                                             updateRelation,
                                             className,
                                             executionInfoClassName,
                                         }: RelationTitleWithActionsProps) {

    const displayName = relationState.viewState.displayName;
    const sql = relationState.query.baseQuery;
    const parameters = relationState.viewState.parametersState?.parameters;
    const executionState = relationState.executionState;
    const lastExecutionMetaData = relationState.lastExecutionMetaData;

    const handleOpenRename = () => {
        useRenameDialogStore.getState().openRelationRenameDialog({
            relationState,
            updateRelation,
        });
    };

    return (
        <div className={`group/title flex items-center gap-1.5 min-w-0 ${className ?? ''}`}>
            <div className="flex flex-row items-end gap-1.5 min-w-0">
                    <span
                        className="leading-none font-semibold text-base whitespace-nowrap overflow-hidden text-ellipsis"
                    >
                        {displayName}
                    </span>
                {executionState && (
                    <RelationExecutionInfo
                        executionState={executionState}
                        lastExecutionMetaData={lastExecutionMetaData}
                        className={executionInfoClassName}
                    />
                )}
            </div>
            <Button
                className="opacity-0 group-hover/title:opacity-100 transition-opacity h-6 w-6 flex-shrink-0"
                onClick={(e) => {
                    e.stopPropagation();
                    handleOpenRename();
                }}
                variant="ghost"
                size="icon"
            >
                <Pencil size={12}/>
            </Button>

            <MacroCopyButton
                relationName={displayName}
                sql={sql}
                parameters={parameters}
                className="opacity-0 group-hover/title:opacity-100 transition-opacity h-6 w-6 flex-shrink-0"
            />
        </div>
    );
}
