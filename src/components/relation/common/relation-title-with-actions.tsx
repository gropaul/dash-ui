import { useState } from "react";
import { Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MacroCopyButton } from "@/components/relation/macro-copy-button";
import { RelationExecutionInfo } from "@/components/relation/common/relation-execution-info";
import { QueryExecutionMetaData, TaskExecutionState } from "@/model/relation-state";
import { ParameterDefinition } from "@/model/relation-view-state/parameters";

export interface RelationTitleWithActionsProps {
    displayName: string;
    sql: string;
    parameters?: ParameterDefinition[];
    onUpdateTitle?: (newTitle: string) => void;
    className?: string;
    executionState?: TaskExecutionState;
    lastExecutionMetaData?: QueryExecutionMetaData;
    executionInfoClassName?: string;
}

/**
 * Shared component for relation title with edit and copy macro buttons.
 * Used in both the relation view header and workflow canvas header.
 * Shows edit and copy buttons on hover.
 */
export function RelationTitleWithActions({
    displayName,
    sql,
    parameters,
    onUpdateTitle,
    className,
    executionState,
    lastExecutionMetaData,
    executionInfoClassName,
}: RelationTitleWithActionsProps) {
    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const [renameValue, setRenameValue] = useState('');

    const handleOpenRename = () => {
        setRenameValue(displayName || '');
        setIsRenameDialogOpen(true);
    };

    const handleSaveRename = () => {
        onUpdateTitle?.(renameValue);
        setIsRenameDialogOpen(false);
    };

    return (
        <>
            <div className={`group/title flex items-center gap-1.5 min-w-0 ${className ?? ''}`}>
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
                {onUpdateTitle && (
                    <Button
                        className="opacity-0 group-hover/title:opacity-100 transition-opacity h-6 w-6 flex-shrink-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenRename();
                        }}
                        variant="ghost"
                        size="icon"
                    >
                        <Pencil size={12} />
                    </Button>
                )}

                <MacroCopyButton
                    relationName={displayName}
                    sql={sql}
                    parameters={parameters}
                    className="opacity-0 group-hover/title:opacity-100 transition-opacity h-6 w-6 flex-shrink-0"
                />
            </div>

            {onUpdateTitle && (
                <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
                    <DialogContent className="sm:max-w-[400px]" onClick={(e) => e.stopPropagation()}>
                        <DialogHeader>
                            <DialogTitle>Rename</DialogTitle>
                        </DialogHeader>
                        <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            placeholder="Enter name"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSaveRename();
                                }
                            }}
                        />
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveRename}>
                                Save
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
