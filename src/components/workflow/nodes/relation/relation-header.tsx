import {useState} from "react";
import {Pencil} from "lucide-react";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {RelationViewType} from "@/model/relation-view-state";
import {defaultColorFactory, defaultIconFactory} from "@/components/basics/files/icon-factories";

import {HEADER_HEIGHT} from "@/components/workflow/models";
import {QueryExecutionMetaData, TaskExecutionState} from "@/model/relation-state";
import {RelationExecutionInfo} from "@/components/relation/common/relation-execution-info";

export interface RelationNodeHeaderProps {
    viewType: RelationViewType;
    displayName: string;
    onUpdateTitle?: (newTitle: string) => void;
    executionState: TaskExecutionState;
    lastExecutionMetaData?: QueryExecutionMetaData;
}

export function RelationNodeHeader(props: RelationNodeHeaderProps) {
    const {viewType, displayName, onUpdateTitle} = props;
    const viewTypeColor = defaultColorFactory(viewType);

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
            <div
                className="group/title border-b"
                style={{
                    padding: '8px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    height: `${HEADER_HEIGHT}px`,
                }}
            >
                <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    background: viewTypeColor.background,
                    color: viewTypeColor.foreground
                }}>
                    {defaultIconFactory(viewType)}
                </div>
                <div style={{display: 'flex', flexDirection: 'column', minWidth: 0}}>
                    <span
                        className={'leading-none pb-0.5'}
                        style={{
                        fontWeight: 600,
                        textAlign: 'left',
                        fontSize: '15px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>
                        {displayName}
                    </span>
                    <RelationExecutionInfo
                        executionState={props.executionState}
                        lastExecutionMetaData={props.lastExecutionMetaData}
                        className="text-[11px]"
                    />
                </div>
                {onUpdateTitle && (
                    <Button
                        className={'opacity-0 group-hover/title:opacity-100 transition-opacity h-7 w-7 flex-shrink-0'}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenRename();
                        }}
                        variant={'ghost'}
                        size={'icon'}
                    >
                        <Pencil size={12}/>
                    </Button>
                )}
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
