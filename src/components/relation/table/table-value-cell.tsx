import React from "react";
import {Column} from "@/model/column";
import {CopyButton} from "@/components/basics/input/copy-button";
import {INITIAL_COLUMN_VIEW_STATE, TableViewState} from "@/model/relation-view-state/table";

interface RowElementViewProps {
    element: any;
    tableState: TableViewState;
    column: Column;
}

export function TableValueCell({ tableState, column, element }: RowElementViewProps) {
    const columnViewState = tableState.columnStates[column.name] ?? INITIAL_COLUMN_VIEW_STATE;
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
            className="px-4 py-1 group"
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
