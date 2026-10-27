'use client';

import React, {useEffect, useState} from "react";
import {createPlatePlugin, PlateElement, PlateElementProps, usePluginOption} from "platejs/react";
import {ResizeEvent, ResizeHandle} from "@platejs/resizable";
import {RelationStateView} from "@/components/relation/relation-state-view";
import {useBlockRelation} from "@/components/page-editor/block-relation";
import {BlockHoverPlugin} from "@/components/page-editor/block-hover";
import {cn} from "@/lib/utils";
import {
    RELATION_BLOCK_KEY,
    GRID_ROW_PX,
    INPUT_ROWS,
    isInputView,
    preventTextSelection,
    TRelationBlock,
} from "@/components/page-editor/model";

const MIN_BLOCK_ROWS = 2;
// The space above and below a block's box (chart, table, input), inside its rows: two stacked boxes are 8px apart.
const BOX_PADDING_PX = 4;

function RelationBlockElement(props: PlateElementProps<TRelationBlock>) {
    const {element, editor} = props;
    const [previewRows, setPreviewRows] = useState<number | null>(null);
    const hovered = usePluginOption(BlockHoverPlugin, 'isHovered', element.id as string);
    // Undefined when the block's input names a query that isn't there.
    const linked = useBlockRelation(element);
    const input = isInputView(linked?.relation.viewState.selectedView);
    const rows = input ? INPUT_ROWS : previewRows ?? element.rows;

    useEffect(() => {
        if (linked?.relation.executionState.state === 'not-started') {
            linked.actions.updateRelationDataWithBaseQuery(linked.relation.query.baseQuery);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [linked?.relation.id]);

    const onResize = ({delta, finished}: ResizeEvent) => {
        const next = Math.max(MIN_BLOCK_ROWS, element.rows + Math.round(delta / GRID_ROW_PX));
        if (!finished) return setPreviewRows(next);
        setPreviewRows(null);
        const path = editor.api.findPath(element);
        if (path) editor.tf.setNodes<TRelationBlock>({rows: next}, {at: path});
    };

    return (
        // The padding is part of the block's rows; the height bar sits on the box's bottom edge inside it.
        <PlateElement {...props} style={{paddingBlock: BOX_PADDING_PX}}>
            <div contentEditable={false}
                 data-relation-block
                 className="relative select-none transition-[height] duration-150 ease-out"
                 style={{height: rows * GRID_ROW_PX - 2 * BOX_PADDING_PX}}>
                <div className={cn("h-full w-full overflow-hidden", !input && "rounded-2xl")}>
                    {linked ? (
                        <RelationStateView
                            embedded
                            showBorder={!input}
                            bare={input}
                            neverShowQueryEditor
                            mode='embedded'
                            height='fit'
                            relationState={linked.relation}
                            updateRelation={linked.updateRelation}
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                            {`${element.header.input} not found`}
                        </div>
                    )}
                </div>
                {!input && <ResizeHandle options={{direction: 'bottom', onResize, onMouseDown: preventTextSelection}}
                              className={cn(
                                  // Above the add strip below the block, where the two meet in a narrow gap.
                                  "absolute inset-x-0 -bottom-1 z-30 h-2 cursor-row-resize flex justify-center group/resize",
                                  "transition-[opacity,transform] duration-150 ease-out",
                                  hovered || previewRows !== null ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-1",
                              )}>
                    <div className="pointer-events-none h-1 w-10 rounded-full bg-border group-hover/resize:bg-primary"/>
                </ResizeHandle>}
            </div>
            {props.children}
        </PlateElement>
    );
}

export const RelationBlockPlugin = createPlatePlugin({
    key: RELATION_BLOCK_KEY,
    node: {isElement: true, isVoid: true, component: RelationBlockElement},
});
