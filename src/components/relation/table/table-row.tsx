import {Row} from "@/model/relation";
import {TableValueCell} from "@/components/relation/table/table-value-cell";

import {Sometype_Mono} from "next/font/google";
import {Column} from "@/model/column";
import {TableViewState} from "@/model/relation-view-state/table";

const fontMono = Sometype_Mono({subsets: ["latin"], weight: "400"});

export interface RowViewProps {
    rowIndex: number;
    row: Row;
    columns: Column[];
    tableViewState: TableViewState;
    offset: number;
}

export function TableRow(props: RowViewProps) {
    const row = props.row;
    const startIndex = props.offset;
    return (
        <tr
            className={`${fontMono.className} bg-white  dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-600`}
            style={{
                boxShadow: 'inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)',
            }}
        >
            {/* Row index */}
            <td
                className="sticky left-0 z-10 pl-4 bg-white text-gray-400 dark:text-gray-300 text-right h-full"
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
                        className="w-0.5 h-full absolute right-0 top-0 z-50 border-r border-gray-700 dark:border-gray-700"
                    />
                </div>
            </td>

            {/* Row elements */}
            {row.map((element: any, index) => (
                <TableValueCell
                    key={index}
                    element={element}
                    column={props.columns[index]}
                    displayState={props.tableViewState}
                />
            ))}
        </tr>
    );
}
