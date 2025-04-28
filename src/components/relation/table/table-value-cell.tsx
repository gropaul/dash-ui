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

    const stringElement = elementToString(element);

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


function elementToString(element: any): string {
    if (element === null || element === undefined) {
        return "NULL";
    }

    // if object or array, return the json string
    if (typeof element === "object") {
        return JSON.stringify(element);
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
    } else { // @ts-ignore
        if (column.type === "Date64") {
            return <span>{element.toLocaleString()}</span>;
        }
    }

    return (
        <span>{stringElement} {column.type}</span>
    );
}