import React from "react";
import {TableHead} from "@/components/relation/table/table-head";
import {RelationViewProps} from "@/components/relation/relation-view";
import {cn} from "@/lib/utils";
import {RelationData, Row} from "@/model/relation";
import {TableValueCell} from "@/components/relation/table/table-value-cell";
import {Sometype_Mono} from "next/font/google";
import {useVirtualizer} from "@tanstack/react-virtual";
import {INITIAL_COLUMN_VIEW_STATE} from "@/model/relation-view-state/table";


export const fontMono = Sometype_Mono({subsets: ["latin"], weight: "400"});

export interface RelationViewTableContentProps extends RelationViewProps {
    columnViewIndices: number[];
    data: RelationData;
}

export const TableContent = React.memo(function TableContent(props: RelationViewTableContentProps) {
    const {data, columnViewIndices, relationState, embedded} = props;

    const limitRows = relationState.query.viewParameters.table.limit;
    const offset = relationState.lastExecutionMetaData?.lastResultOffset || 0;

    const rowsSlice = React.useMemo(() => data.rows.slice(0, limitRows), [data.rows, limitRows]);

    // Get column widths from table state
    const columnWidths = React.useMemo(() => {
        const tableState = relationState.viewState.tableState;
        return data.columns.map(col => {
            const columnState = tableState.columnStates[col.name];
            return columnState?.width ?? INITIAL_COLUMN_VIEW_STATE.width;
        });
    }, [relationState.viewState.tableState, data.columns]);

    // Calculate total table width: row number column (80px) + all column widths
    const totalTableWidth = React.useMemo(() => {
        return 80 + columnWidths.reduce((sum, w) => sum + w, 0);
    }, [columnWidths]);

    const styleMarginRight = embedded ? "mr-0" : "mr-32";

    // Reference to the scrolling parent element
    const [scrollParent, setScrollParent] = React.useState<HTMLElement | null>(null);

    // Callback to find and set the scrolling parent
    const setTableRef = React.useCallback((node: HTMLTableElement | null) => {
        if (node) {
            // Find the scrolling parent (the div with overflow-y-auto)
            let parent = node.parentElement;
            while (parent) {
                const overflow = window.getComputedStyle(parent).overflowY;
                if (overflow === 'auto' || overflow === 'scroll') {
                    setScrollParent(parent);
                    break;
                }
                parent = parent.parentElement;
            }
        }
    }, []);

    // Virtualizer configuration
    const rowVirtualizer = useVirtualizer({
        count: rowsSlice.length,
        getScrollElement: () => scrollParent,
        estimateSize: () => 29, // Approximate row height in pixels
        overscan: 10, // Number of items to render outside the visible area
    });

    const virtualItems = rowVirtualizer.getVirtualItems();

    return (
        <table
            ref={setTableRef}
            className={cn(
                "text-sm bg-inherit text-left rtl:text-right text-muted-foreground h-fit",
                styleMarginRight
            )}
            style={{tableLayout: "fixed", width: totalTableWidth}}
        >
            <TableHead {...props} />
            <tbody className="bg-inherit" style={{position: 'relative'}}>
            {virtualItems.length > 0 && (
                <>
                    {/* Spacer for rows before visible area */}
                    {virtualItems[0].index > 0 && (
                        <tr style={{height: `${virtualItems[0].start}px`}} />
                    )}
                    {/* Render only visible rows */}
                    {virtualItems.map((virtualRow) => {
                        const row = rowsSlice[virtualRow.index];
                        return (
                            <tr
                                className={cn(fontMono.className, "bg-inherit hover:bg-muted border-b mb-0")}
                                key={virtualRow.index}
                            >
                                <td
                                    className="sticky py-1 top-0 left-0 z-[2] w-20 bg-inherit text-muted-foreground text-left"
                                >
                                    <div className={'absolute py-1 top-0 left-0 w-full pl-4 border-r pointer-events-none text-left '}>
                                        {offset + virtualRow.index + 1}
                                    </div>
                                </td>
                                {row.map((value, index) => (
                                    <TableValueCell
                                        key={index}
                                        element={value}
                                        column={props.data.columns[index]}
                                        width={columnWidths[index]}
                                    />
                                ))
                                }
                            </tr>
                        );
                    })}
                </>
            )}
            </tbody>
        </table>
    );
});