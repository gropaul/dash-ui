import {TableColumnHead} from "@/components/relation/table/table-column-head";
import {TableRow} from "@/components/relation/table/table-row";
import React from "react";
import {RelationState} from "@/model/relation-state";

export interface RelationViewTableContentProps {
    relation: RelationState;
    columnViewIndices: number[];
}

export function TableContent(props: RelationViewTableContentProps) {

    const columnViewIndices = props.columnViewIndices;
    return (
        <table
            className="text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 w-fit h-fit mr-32"
            style={{
                tableLayout: "fixed",
                borderCollapse: "collapse",
            }}
        >
            <thead
                className="border-0 text-s text-gray-700 bg-white dark:bg-black dark:text-gray-400 sticky top-0 z-20">
            <tr>
                {/* Row index column header, should fit the cells with*/}
                <th
                    scope="col"
                    className="p-0 m-0 h-8 sticky left-0 z-20 bg-white dark:bg-black dark:text-gray-400 w-20"
                >
                    <div
                        className="w-full h-full absolute right-0 top-0 z-50 border-r border-b border-gray-700 dark:border-gray-700"
                    />
                </th>
                {/* Column headers */}
                {columnViewIndices.map((index) => (
                    <TableColumnHead
                        relationId={props.relation.id}
                        key={index}
                        column={props.relation.columns[index]}
                    />
                ))}
            </tr>
            </thead>
            <tbody>
            {props.relation.rows.map((row, index) => (
                <TableRow
                    key={index}
                    relationId={props.relation.id}
                    rowIndex={index}
                    row={row}
                    columns={props.relation.columns}
                    offset={props.relation.query.parameters.offset}
                    columnViewIndices={columnViewIndices}
                />
            ))}
            </tbody>
        </table>
    )
}