'use client';

import React, {useRef} from "react";
import {DropTargetMonitor} from "react-dnd";
import {DndPlugin, DragItemNode, useDndNode} from "@platejs/dnd";
import {BlockSelectionPlugin} from "@platejs/selection/react";
import {ElementApi, KEYS, PathApi, TElement} from "platejs";
import {
    PlateElementProps,
    RenderNodeWrapper,
    useEditorRef,
    usePluginOption,
    useReadOnly,
} from "platejs/react";
import {BlockToolbar} from "@/components/page-editor/block-toolbar";
import {AddBelow} from "@/components/page-editor/add-below";
import {BlockHoverPlugin} from "@/components/page-editor/block-hover";
import {BLOCK_TYPES, getElementType, selectBlocks, setBlockType} from "@/components/page-editor/block-types";
import {BlockTypeButton} from "@/components/page-editor/add-menu";
import {defaultIconFactory} from "@/components/basics/files/icon-factories";
import {VIEW_MODES} from "@/components/relation/settings/view-mode-picker";
import {headerForViewType, useBlockRelation, useBlockRelations} from "@/components/page-editor/block-relation";
import {RelationViewType} from "@/model/relation-view-state";
import {TRelationBlock} from "@/components/page-editor/model";
import {
    canDrop,
    getEntries,
    insertBlock,
    isMovableBlock,
    moveBlocks,
    removeBlock,
    Side,
    withFullRows,
    withoutBlockSelection,
} from "@/components/page-editor/block-moves";
import {cn} from "@/lib/utils";

// Fraction of a block's width at each edge where a drop goes beside it instead of above/below.
const SIDE_DROP_ZONE = 0.2;
function getDropSide(nodeRef: React.RefObject<HTMLDivElement | null>, monitor: DropTargetMonitor): Side | undefined {
    const rect = nodeRef.current?.getBoundingClientRect();
    const offset = monitor.getClientOffset();
    if (!rect || !offset) return;
    const fx = (offset.x - rect.left) / rect.width;
    if (fx < SIDE_DROP_ZONE) return 'left';
    if (fx > 1 - SIDE_DROP_ZONE) return 'right';
    return offset.y - rect.top < rect.height / 2 ? 'top' : 'bottom';
}

function Draggable(props: PlateElementProps) {
    const {children, element} = props;
    const editor = useEditorRef();
    const nodeRef = useRef<HTMLDivElement>(null);
    const readOnly = useReadOnly();
    const id = element.id as string;
    const dropTarget = usePluginOption(DndPlugin, 'dropTarget');
    const dropLine = dropTarget?.id === id ? dropTarget.line : '';
    const hovered = usePluginOption(BlockHoverPlugin, 'isHovered', id);
    const selectedIds = usePluginOption(BlockSelectionPlugin, 'selectedIds');
    const selected = !!selectedIds?.has(id);
    const multiSelected = selected && selectedIds!.size > 1;
    // A multi-selection gets a single bar, on its first block in document order.
    const leadsSelection = multiSelected && editor.getApi(BlockSelectionPlugin).blockSelection.first()?.[0].id === id;
    const showToolbar = multiSelected ? leadsSelection : hovered;
    // A row has no bar of its own (hovering the gap between its columns shows nothing); it moves
    // as a whole when all its blocks are selected.
    const isRow = element.type === KEYS.columnGroup;
    // Relation blocks add the relation buttons (run, fullscreen); in view mode those are all that's left.
    const relationBlock = useBlockRelation(element);
    const setFullscreen = useBlockRelations(s => s.setFullscreen);
    const showBar = !isRow && (!readOnly || !!relationBlock);
    const elementType = getElementType(element);
    const textType = elementType ? BLOCK_TYPES.find(t => t.key === elementType) ?? BLOCK_TYPES.find(t => t.key === KEYS.p)! : undefined;

    const {dragRef, isDragging} = useDndNode({
        element,
        nodeRef,
        drop: {
            hover: (item: DragItemNode, monitor) => {
                if (!monitor.isOver({shallow: true}) || !('element' in item)) return;
                const side = getDropSide(nodeRef, monitor);
                const line = side && canDrop(editor, [item.id].flat(), id, side) ? side : '';
                const current = editor.getOption(DndPlugin, 'dropTarget');
                if (current?.id !== id || current.line !== line) {
                    editor.setOption(DndPlugin, 'dropTarget', {id, line});
                }
            },
            drop: (item: DragItemNode, monitor) => {
                // react-dnd re-runs hover right before the drop, after Plate's own clear, and the moved
                // block's drag source unmounts before its drag end can clear it.
                editor.setOption(DndPlugin, 'dropTarget', {id: null, line: ''});
                if (monitor.didDrop() || !('element' in item)) return;
                const side = getDropSide(nodeRef, monitor);
                const dragIds = [item.id].flat();
                if (side && canDrop(editor, dragIds, id, side)) moveBlocks(editor, dragIds, id, side);
            },
        },
    });

    const selectionIds = () => editor.getApi(BlockSelectionPlugin).blockSelection.getNodes().map(([node]) => node.id);

    // Stops Plate from clearing the block selection on this press. Plate's drag source then carries
    // every id in `draggingId` when it includes the dragged block.
    const onToolbarMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        editor.setOption(DndPlugin, 'draggingId', multiSelected ? withFullRows(editor, selectionIds()) : id);
    };

    // An inline block's view type lives in the fence's `view:` line and the block rebuilds its relation from
    // it; a reference changes its relation.
    const setChartView = (viewType: RelationViewType) => {
        const path = editor.api.findPath(element);
        if (!relationBlock || !path) return;
        if (relationBlock.isReference) return relationBlock.actions.setRelationViewType(viewType);
        const header = {...(element as TRelationBlock).header, view: headerForViewType(relationBlock.relation, viewType)};
        editor.tf.setNodes<TRelationBlock>({header}, {at: path});
    };

    // A row added from a block inside a column goes below that whole row; rows don't nest.
    const insertBelow = (node: TElement) => {
        const path = editor.api.findPath(element);
        if (!path) return;
        insertBlock(editor, node, node.type === KEYS.columnGroup && path.length > 1 ? PathApi.next(path.slice(0, 1)) : PathApi.next(path));
    };

    const onRemove = () => {
        const entries = getEntries(editor, multiSelected ? selectionIds() : [id]);
        withoutBlockSelection(editor, () => [...entries].reverse().forEach(([, at]) => removeBlock(editor, at)));
    };

    return (
        <div ref={nodeRef}
             data-draggable-id={isRow ? undefined : id}
             className={cn("relative", isDragging && "opacity-40")}>
            {showBar && (
                // The block's bar, centered just above it.
                <div contentEditable={false}
                     onMouseDown={onToolbarMouseDown}
                     className="pointer-events-none absolute bottom-full left-1/2 z-30 -translate-x-1/2 select-none">
                    <BlockToolbar
                        className={cn("transition-opacity", showToolbar ? "opacity-100 pointer-events-auto" : "opacity-0")}
                        draggable={!readOnly}
                        dragHandleRef={el => { dragRef(el); }}
                        menu={readOnly ? undefined : relationBlock && !multiSelected ? (
                            <BlockTypeButton
                                kind="data"
                                icon={defaultIconFactory(relationBlock.relation.viewState.selectedView)}
                                items={VIEW_MODES.map(({viewType, label, ready}) => ({
                                    label, ready,
                                    icon: defaultIconFactory(viewType),
                                    active: viewType === relationBlock.relation.viewState.selectedView,
                                    onSelect: () => setChartView(viewType),
                                }))}
                            />
                        ) : textType && (
                            <BlockTypeButton
                                kind="text"
                                icon={<textType.icon size={16}/>}
                                items={BLOCK_TYPES.map(({key, label, icon: Icon}) => ({
                                    label,
                                    icon: <Icon size={16}/>,
                                    active: key === textType.key,
                                    onSelect: () => {
                                        selectBlocks(editor, multiSelected ? selectionIds() : [id]);
                                        setBlockType(editor, key);
                                    },
                                }))}
                            />
                        )}
                        {...(relationBlock && !multiSelected && {
                            runState: relationBlock.relation.executionState,
                            onRun: () => relationBlock.actions.updateRelationDataWithBaseQuery(relationBlock.relation.query.baseQuery),
                            onStopRun: relationBlock.actions.cancelQuery,
                            onFullscreen: () => setFullscreen({relationId: relationBlock.relation.id, blockId: id}),
                        })}
                        onRemove={readOnly ? undefined : onRemove}
                    />
                </div>
            )}
            {children}
            {!readOnly && !isRow && (
                <AddBelow visible={hovered && !multiSelected} anchorRef={nodeRef} onInsert={insertBelow}/>
            )}
            {selected && <div contentEditable={false} className="pointer-events-none absolute inset-0 z-10 rounded-md bg-primary/10"/>}
            {dropLine && <DropLine side={dropLine}/>}
        </div>
    );
}

function DropLine({side}: { side: Side }) {
    return (
        <div contentEditable={false} className={cn(
            "pointer-events-none absolute z-30 rounded-full bg-primary",
            side === 'top' && "inset-x-0 -top-0.5 h-1",
            side === 'bottom' && "inset-x-0 -bottom-0.5 h-1",
            side === 'left' && "inset-y-0 -left-3.5 w-1",
            side === 'right' && "inset-y-0 -right-3.5 w-1",
        )}/>
    );
}

export const BlockDraggable: RenderNodeWrapper = ({element, path}) => {
    if (!ElementApi.isElement(element) || !isMovableBlock(path)) return;
    return function DraggableBlock(props) {
        return <Draggable {...props}/>;
    };
};
