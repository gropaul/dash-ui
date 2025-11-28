import {Row} from "@/model/relation";
import {TableValueCell} from "@/components/relation/table/table-value-cell";

import {Sometype_Mono} from "next/font/google";
import {Column} from "@/model/data-source-connection";
import {TableViewState} from "@/model/relation-view-state/table";

export const fontMono = Sometype_Mono({subsets: ["latin"], weight: "400"});

export interface RowViewProps {
    rowIndex: number;
    row: Row;
    columns: Column[];
    columnViewIndices: number[];
    offset: number;
}

export function TableRow(props: RowViewProps) {
    const row = props.row;
    const startIndex = props.offset;
    return (
        <tr
            className={`${fontMono.className} bg-inherit hover:bg-muted`}
            style={{
                boxShadow: 'inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)',
            }}
        >
            {/* Row index */}
            <td
                className="sticky left-0 z-[2] pl-4 bg-inherit text-muted-foreground text-right h-full"
                style={{
                    boxShadow: 'inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)',
                    overflow: 'hidden',  // Ensures overflow is hidden within the cell
                    whiteSpace: 'nowrap' // Keeps content in a single line
                }}
            >
                <div className="flex items-center justify-between">
                <span className="truncate" title={`${startIndex + props.rowIndex + 1}`}>
                    {startIndex + props.rowIndex + 1}
                </span>
                    <div
                        className="w-0.5 h-full absolute right-0 top-0 z-[3] border-r border-border"
                    />
                </div>
            </td>

            {/* Row elements */}
            {props.columnViewIndices.map((index) => (
                <TableValueCell
                    key={index}
                    element={row[index]}
                    column={props.columns[index]}
                />
            ))}
        </tr>
    );
}
