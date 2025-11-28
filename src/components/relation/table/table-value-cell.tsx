import React, {useMemo} from "react";
import {Column} from "@/model/data-source-connection";
import {CopyButton} from "@/components/basics/input/copy-button";
import {RecursiveJsonViewer} from "@/components/ui/json-viewer";

interface RowElementViewProps {
    element: any;
    column: Column;
}

export const TableValueCell = React.memo(function TableValueCell({column, element}: RowElementViewProps) {

    const stringElement: string = useMemo(() => {
        console.log("Rendering TableValueCell:", {element, column});
        if (element === null || element === undefined) return "NULL";

        if (column.type === "List" || column.type === "Map" || column.type === "Struct") {
            // structured types never use stringElement as display value
            return JSON.stringify(element);
        }

        if (typeof element === "object") return JSON.stringify(element);

        if (column.type === "Timestamp") return new Date(element).toLocaleString();

        return element.toString();
    }, [element, column.type]);

    return (
        <td
            className="relative px-4 py-1 group"
            style={{
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
            }}
            title={stringElement}
        >
            <ValueElement
                column={column}
                element={element}
                stringElement={stringElement}
            />

            {/* Copy button (invisible until hover) */}
            <CopyButton
                className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                textToCopy={stringElement}
            />
        </td>
    );
});


interface ValueElementProps {
    column: Column;
    element: any;
    stringElement: string;
}

export const ValueElement = React.memo(function ValueElement({column, element, stringElement}: ValueElementProps) {
    if (column.type === "List" || column.type === "Map" || column.type === "Struct") {
        return <MemoJsonViewer json={element} />;
    }

    return <>{stringElement}</>;
});

const MemoJsonViewer = React.memo(function MemoJsonViewer({json}: { json: any }) {
    return <RecursiveJsonViewer json={json} />;
});
