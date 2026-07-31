import React, {useMemo, useState} from "react";
import {Expand} from "lucide-react";
import {Column} from "@/model/data-source-connection";
import {CopyButton} from "@/components/basics/input/copy-button";
import {RecursiveJsonViewer} from "@/components/ui/json-viewer";
import {MyDialog} from "@/components/ui/my-dialog";
import {COLUMN_VALUE_EXPAND_THRESHOLD} from "@/platform/global-data";
import {DecoratedValue} from "@/components/relation/common/decorated-value";
import {
    ColumnDecoration,
    hasNonDefaultDecoration,
    isDecoratableType,
} from "@/model/relation-view-state/decoration";

const isStructured = (type: Column["type"]) =>
    type === "List" || type === "Map" || type === "Struct";

interface RowElementViewProps {
    element: any;
    column: Column;
    width?: number;
    decoration?: ColumnDecoration;
    rangeMin?: number;
    rangeMax?: number;
    categoryColors?: Map<string, string>;
}

export const TableValueCell = React.memo(function TableValueCell({column, element, width, decoration, rangeMin, rangeMax, categoryColors}: RowElementViewProps) {

    const stringElement: string = useMemo(() => {
        if (element === null || element === undefined) return "NULL";

        if (column.type === "List" || column.type === "Map" || column.type === "Struct") {
            // structured types never use stringElement as display value
            return JSON.stringify(element);
        }

        if (typeof element === "object") return JSON.stringify(element);

        if (column.type === "Timestamp") return new Date(element).toLocaleString();

        return element.toString();
    }, [element, column.type]);

    const decorated = decoration
        && hasNonDefaultDecoration(decoration)
        && isDecoratableType(column.type);

    const canExpand = stringElement.length > COLUMN_VALUE_EXPAND_THRESHOLD;

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
        {decorated ? (
            <DecoratedValue
                value={element}
                fallbackString={stringElement}
                decoration={decoration}
                rangeMin={rangeMin}
                rangeMax={rangeMax}
                categoryColors={categoryColors}
                className="w-full min-w-0"
            />
        ) : (
            <div
                className="min-h-5"       // keeps the row height for empty values
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
        )}

        {/* fade the cell content behind the hover buttons so they stay legible over any value */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"/>

        {canExpand && (
            <ExpandButton
                className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                column={column}
                element={element}
                stringElement={stringElement}
            />
        )}

        <CopyButton
            className={`absolute ${canExpand ? "right-7" : "right-1"} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity`}
            textToCopy={stringElement}
        />
    </td>

});


interface ExpandButtonProps {
    column: Column;
    element: any;
    stringElement: string;
    className?: string;
}

function ExpandButton({column, element, stringElement, className}: ExpandButtonProps) {
    const [open, setOpen] = useState(false);

    const handleOpen = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setOpen(true);
    };

    return (
        <>
            <button onClick={handleOpen} className={`cursor-pointer ${className ?? ""}`} title="Expand value">
                <Expand className="hover:text-primary text-muted-foreground" size={14}/>
            </button>
            <MyDialog open={open} onOpenChange={setOpen} className="max-w-2xl rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-foreground truncate">{column.name}</span>
                    <CopyButton textToCopy={stringElement}/>
                </div>
                <div className="max-h-[60vh] overflow-auto">
                    {isStructured(column.type) ? (
                        <RecursiveJsonViewer json={element}/>
                    ) : (
                        <pre className="whitespace-pre-wrap break-words text-sm text-foreground font-mono">
                            {stringElement}
                        </pre>
                    )}
                </div>
            </MyDialog>
        </>
    );
}


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
