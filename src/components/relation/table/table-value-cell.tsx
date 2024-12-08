import React from "react";
import {Column} from "@/model/column";
import {useRelationsState} from "@/state/relations.state";
import {shallow} from "zustand/shallow";
import {CopyButton} from "@/components/basics/input/copy-button";
import {INITIAL_COLUMN_VIEW_STATE} from "@/model/relation-view-state/table";

interface RowElementViewProps {
    relationId: string;
    element: any;
    column: Column;
}

export function TableValueCell({ relationId, column, element }: RowElementViewProps) {
    const columnViewState = useRelationsState(
        (state) => state.getRelationViewState(relationId).tableState.columnStates[column.name],
        shallow
    ) ?? INITIAL_COLUMN_VIEW_STATE;
    const wrapContent = columnViewState.wrapContent;
    const columnWidth = columnViewState.width + "px";

    let stringElement: string;
    try {
        if (element === null || element === undefined) {
            stringElement = "null";
        } else {
            stringElement = element.toString();
        }
    } catch (e) {
        stringElement = "Error";
        console.error("Error converting element to string", element, e);
    }


    return (
        <td
            className="relative px-4 py-1 group"
            style={{
                width: columnWidth,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
            }}
            title={stringElement}
        >
            <div className="flex items-center justify-between group-hover:overflow-hidden">
                <span
                    className="truncate"
                    style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {stringElement}
                </span>
                <CopyButton
                    className={"hidden group-hover:block"}
                    size={14}
                    textToCopy={stringElement}
                />
            </div>
        </td>
    );
}
