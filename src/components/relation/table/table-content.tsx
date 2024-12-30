import {TableColumnHead} from "@/components/relation/table/table-head/table-column-head";
import {TableRow} from "@/components/relation/table/table-row";
import React from "react";
import {RelationState} from "@/model/relation-state";
import {TableHead} from "@/components/relation/table/table-head";

export interface RelationViewTableContentProps {
    relation: RelationState;
    columnViewIndices: number[];
}

export function TableContent(props: RelationViewTableContentProps) {

    const relationData = props.relation.data!;
    const columnViewIndices = props.columnViewIndices;
    return (
        <table
            className="text-sm text-left rtl:text-right text-muted-foreground w-fit h-fit mr-32"
            style={{
                tableLayout: "fixed",
                borderCollapse: "collapse",
            }}
        >
            <TableHead
                relationId={props.relation.id}
                relationData={relationData}
                columnViewIndices={columnViewIndices}
            />
            <tbody>
            {relationData.rows.map((row, index) => (
                <TableRow
                    key={index}
                    relationId={props.relation.id}
                    rowIndex={index}
                    row={row}
                    columns={relationData.columns}
                    offset={props.relation.lastExecutionMetaData?.lastResultOffset || 0}
                    columnViewIndices={columnViewIndices}
                />
            ))}
            </tbody>
        </table>
    )
}