import {TableRow} from "@/components/relation/table/table-row";
import React from "react";
import {TableHead} from "@/components/relation/table/table-head";
import {RelationViewProps} from "@/components/relation/relation-view";

export interface RelationViewTableContentProps extends RelationViewProps {
    columnViewIndices: number[];
}

export function TableContent(props: RelationViewTableContentProps) {

    const relationData = props.relationState.data!;
    const columnViewIndices = props.columnViewIndices;
    return (
        <table
            className="text-sm text-left rtl:text-right text-muted-foreground w-fit h-fit mr-32"
            style={{
                tableLayout: "fixed",
                borderCollapse: "collapse",
            }}
        >
            <TableHead {...props} />
            <tbody>
            {relationData.rows.map((row, index) => (
                <TableRow
                    key={index}
                    relationId={props.relationState.id}
                    rowIndex={index}
                    row={row}
                    columns={relationData.columns}
                    offset={props.relationState.lastExecutionMetaData?.lastResultOffset || 0}
                    columnViewIndices={columnViewIndices}
                />
            ))}
            </tbody>
        </table>
    )
}