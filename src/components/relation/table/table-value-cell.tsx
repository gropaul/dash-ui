import React, {useMemo} from "react";
import {Column} from "@/model/data-source-connection";
import {CopyButton} from "@/components/basics/input/copy-button";
import {RecursiveJsonViewer} from "@/components/ui/json-viewer";

interface RowElementViewProps {
    element: any;
    column: Column;
    width?: number;
}

export const TableValueCell = React.memo(function TableValueCell({column, element, width}: RowElementViewProps) {

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

    return <td
        className="relative px-4 py-1 group"
        style={{
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            width: width ? `${width}px` : undefined,
            maxWidth: width ? `${width}px` : undefined,
        }}
        title={stringElement}
    >
        <div
            style={{
                minWidth: 0,           // <-- CRITICAL
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "block",      // ensures shrinkability
                width: "100%",
            }}
        >
            <ValueElement
                column={column}
                element={element}
                stringElement={stringElement}
            />
        </div>

        <CopyButton
            className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
            textToCopy={stringElement}
        />
    </td>

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
