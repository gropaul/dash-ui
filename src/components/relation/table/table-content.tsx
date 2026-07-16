import React from "react";
import {TableHead} from "@/components/relation/table/table-head";
import {RelationViewProps} from "@/components/relation/relation-view";
import {cn} from "@/lib/utils";
import {RelationData} from "@/model/relation";
import {TableValueCell} from "@/components/relation/table/table-value-cell";
import {Sometype_Mono} from "next/font/google";
import {useVirtualizer} from "@tanstack/react-virtual";
import {INITIAL_COLUMN_VIEW_STATE} from "@/model/relation-view-state/table";
import {buildCategoryColorMap, ColumnDecoration, styleNeedsRange, toNumeric} from "@/model/relation-view-state/decoration";
import {DEFAULT_COLORS} from "@/platform/global-data";


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

    // Get column widths from table state (only for visible columns)
    const columnWidths = React.useMemo(() => {
        const tableState = relationState.viewState.tableState;
        return columnViewIndices.map(colIndex => {
            const col = data.columns[colIndex];
            const columnState = tableState.columnStates[col.name];
            return columnState?.width ?? INITIAL_COLUMN_VIEW_STATE.width;
        });
    }, [relationState.viewState.tableState, data.columns, columnViewIndices]);

    // Decorations for visible columns (aligned with columnViewIndices)
    const columnDecorations = React.useMemo(() => {
        const tableState = relationState.viewState.tableState;
        return columnViewIndices.map(colIndex => {
            const col = data.columns[colIndex];
            return tableState.columnStates[col.name]?.decoration;
        });
    }, [relationState.viewState.tableState, data.columns, columnViewIndices]);

    // Page-level min/max per column, only for styles that need a range
    // (data bar / color scale). Scaled to the loaded rows, not the full result.
    const columnRanges = React.useMemo(() => {
        return columnViewIndices.map((colIndex, i) => {
            const decoration: ColumnDecoration | undefined = columnDecorations[i];
            if (!decoration || !styleNeedsRange(decoration.style)) return undefined;
            let min = Infinity;
            let max = -Infinity;
            for (const row of rowsSlice) {
                const num = toNumeric(row[colIndex]);
                if (num === null || isNaN(num)) continue;
                if (num < min) min = num;
                if (num > max) max = num;
            }
            if (min === Infinity) return undefined;
            return {min, max};
        });
    }, [rowsSlice, columnViewIndices, columnDecorations]);

    // Collision-free value -> color map per badge column, sampled from the
    // loaded rows. Values beyond the sample cap fall back to a hashed color.
    const columnCategoryColors = React.useMemo(() => {
        return columnViewIndices.map((colIndex, i) => {
            const decoration: ColumnDecoration | undefined = columnDecorations[i];
            if (!decoration || decoration.style !== 'badge') return undefined;
            return buildCategoryColorMap(rowsSlice.map(row => row[colIndex]), DEFAULT_COLORS);
        });
    }, [rowsSlice, columnViewIndices, columnDecorations]);

    const showIndexColumn = relationState.viewState.tableState.showIndexColumn ?? true;

    // Calculate total table width: row number column (80px if shown) + visible column widths
    const totalTableWidth = React.useMemo(() => {
        const indexColumnWidth = showIndexColumn ? 80 : 0;
        return indexColumnWidth + columnWidths.reduce((sum, w) => sum + w, 0);
    }, [columnWidths, showIndexColumn]);

    const styleMarginRight = embedded ? "mr-0" : "mr-32";

    // Reference to the scrolling parent element
    const [scrollParent, setScrollParent] = React.useState<HTMLElement | null>(null);

    // Callback to find and set the scrolling parent
    const setTableRef = React.useCallback((node: HTMLTableElement | null) => {
        if (node) {
            // Find the scrolling parent: either a plain overflow container or a
            // radix ScrollArea viewport (which only gets overflow: scroll set in
            // an effect after mount, so check the attribute instead of the style)
            let parent = node.parentElement;
            while (parent) {
                const overflow = window.getComputedStyle(parent).overflowY;
                if (overflow === 'auto' || overflow === 'scroll'
                    || parent.hasAttribute('data-radix-scroll-area-viewport')) {
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
    const totalSize = rowVirtualizer.getTotalSize();

    return (
        <table
            ref={setTableRef}
            className={cn(
                "text-sm bg-inherit border-r text-left rtl:text-right text-muted-foreground h-fit",
                styleMarginRight
            )}
            style={{tableLayout: "fixed", width: totalTableWidth}}
        >
            <TableHead {...props} />
            <tbody className="bg-card" style={{position: 'relative'}}>
            {virtualItems.length > 0 && (
                <>
                    {/* Spacer for rows before visible area */}
                    {virtualItems[0].start > 0 && (
                        <tr>
                            <td
                                colSpan={columnViewIndices.length + (showIndexColumn ? 1 : 0)}
                                style={{height: `${virtualItems[0].start}px`, padding: 0}}
                            />
                        </tr>
                    )}
                    {/* Render only visible rows */}
                    {virtualItems.map((virtualRow) => {
                        const row = rowsSlice[virtualRow.index];
                        return (
                            <tr
                                className={cn(fontMono.className, "bg-inherit hover:bg-muted border-b mb-0")}
                                key={virtualRow.index}
                            >
                                {showIndexColumn && (
                                    <td
                                        className="sticky py-1 top-0 left-0 z-[2] w-20 bg-inherit text-muted-foreground text-left"
                                    >
                                        <div className={'absolute py-1 top-0 left-0 w-full pl-4 border-r pointer-events-none text-left '}>
                                            {offset + virtualRow.index + 1}
                                        </div>
                                    </td>
                                )}
                                {columnViewIndices.map((colIndex, i) => (
                                    <TableValueCell
                                        key={colIndex}
                                        element={row[colIndex]}
                                        column={data.columns[colIndex]}
                                        width={columnWidths[i]}
                                        decoration={columnDecorations[i]}
                                        rangeMin={columnRanges[i]?.min}
                                        rangeMax={columnRanges[i]?.max}
                                        categoryColors={columnCategoryColors[i]}
                                    />
                                ))
                                }
                            </tr>
                        );
                    })}
                    {/* Spacer for rows after visible area */}
                    {virtualItems[virtualItems.length - 1].end < totalSize && (
                        <tr>
                            <td
                                colSpan={columnViewIndices.length + (showIndexColumn ? 1 : 0)}
                                style={{height: `${totalSize - virtualItems[virtualItems.length - 1].end}px`, padding: 0}}
                            />
                        </tr>
                    )}
                </>
            )}
            </tbody>
        </table>
    );
});