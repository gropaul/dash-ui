import {Pencil} from "lucide-react";
import {Button} from "@/components/ui/button";
import {MacroCopyButton} from "@/components/relation/macro-copy-button";
import {RelationExecutionInfo} from "@/components/relation/common/relation-execution-info";
import {RelationState} from "@/model/relation-state";
import {useRenameDialogStore} from "@/state/rename-dialog.state";
import {useEffect, useRef, useState} from "react";
import {H4, H5} from "@/components/ui/typography";

export interface RelationTitleWithActionsProps {
    relationState: RelationState;
    className?: string;
    executionInfoClassName?: string;
}

/**
 * Shared component for relation title with edit and copy macro buttons.
 * Used in both the relation view header and canvas canvas header.
 * Shows edit and copy buttons on hover.
 */
export function RelationTitleWithActions({
                                             relationState,
                                             className,
                                             executionInfoClassName,
                                         }: RelationTitleWithActionsProps) {

    const displayName = relationState.viewState.displayName;
    const sql = relationState.query.baseQuery;
    const parameters = relationState.viewState.parametersState?.parameters;
    const executionState = relationState.executionState;
    const lastExecutionMetaData = relationState.lastExecutionMetaData;

    const containerRef = useRef<HTMLDivElement>(null);
    const [showExecInfo, setShowExecInfo] = useState(true);

    useEffect(() => {
        const parent = containerRef.current?.parentElement;
        if (!parent) return;
        const observer = new ResizeObserver(() => {
            setShowExecInfo(parent.offsetWidth >= 200);
        });
        observer.observe(parent);
        return () => observer.disconnect();
    }, []);

    const handleOpenRename = () => {
        useRenameDialogStore.getState().openRelationRenameDialog(relationState);
    };

    return (
        <div ref={containerRef} className={`group/title flex items-center min-w-0 flex-1 ${className ?? ''}`}>
            <div className="flex flex-row items-center gap-1.5 min-w-0 overflow-hidden whitespace-nowrap">
                    <H5
                        className="font-semibold text-sm whitespace-nowrap overflow-hidden text-ellipsis min-w-0"
                    >
                        {displayName}
                    </H5>
                {showExecInfo && executionState && (
                    <span className="overflow-hidden text-ellipsis min-w-0 flex-shrink">
                        <RelationExecutionInfo
                            executionState={executionState}
                            lastExecutionMetaData={lastExecutionMetaData}
                            className={`${executionInfoClassName ?? ''} whitespace-nowrap`}
                        />
                    </span>
                )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 overflow-hidden max-w-0 opacity-0 group-hover/title:max-w-16 group-hover/title:opacity-100 transition-all duration-200 ease-out">
                <Button
                    className="h-6 w-6 flex-shrink-0 ml-1.5"
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
                    className="h-6 w-6 flex-shrink-0"
                />
            </div>
        </div>
    );
}
