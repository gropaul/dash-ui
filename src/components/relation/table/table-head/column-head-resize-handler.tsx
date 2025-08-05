import {INITIAL_COLUMN_VIEW_STATE, TableViewState} from "@/model/relation-view-state/table";

import React, {useRef} from "react";
import {DeepPartial} from "@/platform/object-utils";
import {RelationViewState} from "@/model/relation-view-state";
import {Column} from "@/model/data-source-connection";

interface ColumnHeadResizeHandleProps {
    relationId: string;
    displayState: TableViewState;
    column: Column;
    updateRelationViewState: (relationId: string, viewState: DeepPartial<RelationViewState>) => void,
}

export function ColumnHeadResizeHandle({relationId, displayState, column, updateRelationViewState}: ColumnHeadResizeHandleProps) {

    const initialX = useRef<number | null>(null);
    const columnViewState = displayState.columnStates[column.name] ?? INITIAL_COLUMN_VIEW_STATE;
    const widthRef = useRef<number>(columnViewState.width);

    function onMouseMove(event: MouseEvent) {
        if (initialX.current !== null) {
            const deltaX = event.clientX - initialX.current;
            const newStates = {...displayState.columnStates};

            if (!newStates[column.name]) {
                newStates[column.name] = {...INITIAL_COLUMN_VIEW_STATE};
            }

            newStates[column.name].width = Math.max(widthRef.current + deltaX, 50); // Set a minimum width of 50px

            updateRelationViewState(relationId, {
                tableState: {
                    ...displayState,
                    columnStates: newStates,
                },
            });
        }
    }

    function onMouseUp() {
        initialX.current = null;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
    }

    function onMouseDown(event: React.MouseEvent) {
        event.preventDefault(); // Prevent text selection
        initialX.current = event.clientX;
        widthRef.current = (displayState.columnStates[column.name] ?? INITIAL_COLUMN_VIEW_STATE).width;
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }

    return (
        <div
            onMouseDown={onMouseDown}
            className="absolute right-0 top-0 h-full cursor-col-resize w-2 flex justify-center items-center"
            style={{marginRight: "4px"}} // Add margin to separate from icons
        >
            <div className="h-3 w-1 border-l border-gray-700 dark:border-gray-700"/>
        </div>
    );
}