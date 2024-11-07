import { Row } from "@/model/relation";
import { RelationTableViewState } from "@/components/relation/relation-view";
import { ValueCellView } from "@/components/relation/value-cell-view";

import { Sometype_Mono } from "next/font/google";

const fontMono = Sometype_Mono({ subsets: ["latin"], weight: "400" });

export interface RowViewProps {
    rowIndex: number;
    row: Row;
    displayState: RelationTableViewState;
}

export function RowView(props: RowViewProps) {
    const row = props.row;
    return (
        <tr
            className={`${fontMono.className} bg-white  dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-600`}
            style={{
                boxShadow: 'inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)',
            }}
        >
            {/* Row index */}
            <td
                className="sticky left-0 z-10 px-4 flex-row h-full bg-white text-gray-400 dark:text-gray-300 text-right"
                style={{
                    boxShadow: 'inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)',
                }}
            >
                <div>
                    {props.rowIndex + 1}
                </div>
                <div
                    className="w-0.5 h-full absolute right-0 top-0 z-50 border-r border-gray-700 dark:border-gray-700"/>
            </td>

            {/* Row elements */}
            {row.map((element: any, index) => (
                <ValueCellView key={index} element={element} index={index} displayState={props.displayState}/>
            ))}
        </tr>
    );
}
