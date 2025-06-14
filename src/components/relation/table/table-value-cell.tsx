import React from "react";
import {Column} from "@/model/column";
import {CopyButton} from "@/components/basics/input/copy-button";
import {INITIAL_COLUMN_VIEW_STATE, TableViewState} from "@/model/relation-view-state/table";
import {RecursiveJsonViewer} from "@/components/ui/json-viewer";

interface RowElementViewProps {
    element: any;
    tableState: TableViewState;
    column: Column;
}


export function TableValueCell({tableState, column, element}: RowElementViewProps) {
    const columnViewState = tableState.columnStates[column.name] ?? INITIAL_COLUMN_VIEW_STATE;
    const wrapContent = columnViewState.wrapContent;
    const columnWidth = columnViewState.width + "px";

    const stringElement = elementToString(element, column);

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
                    <ValueElement
                        column={column}
                        element={element}
                        stringElement={stringElement}
                    />
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


function elementToString(element: any, column: Column): string {
    if (element === null || element === undefined) {
        return "NULL";
    }

    // if object or array, return the json string
    if (typeof element === "object") {
        return JSON.stringify(element);
    }

    if (column.type === "Timestamp") {
        // create date from timestamp number
        const date = new Date(element);
        return date.toLocaleString();
    }

    return element.toString();
}

interface ValueElementProps {
    column: Column;
    element: any;
    stringElement: string;
}


export function ValueElement({column, element, stringElement}: ValueElementProps) {

    if (element === null || element === undefined) {
        return <span>NULL</span>;
    }

    // if element is array or object, show the json element viewer
    if (column.type === "List" || column.type === "Map" || column.type === "Struct") {
        return (
            <RecursiveJsonViewer json={element}/>
        );
    } else {
        if (column.type === "Timestamp") {
            // create date from timestamp number
            const date = new Date(element);
            return <span>{date.toLocaleString()}</span>;
        }
    }

    return (
        <span>{stringElement}</span>
    );
}