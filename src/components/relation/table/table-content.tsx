import {TableRow} from "@/components/relation/table/table-row";
import React from "react";
import {TableHead} from "@/components/relation/table/table-head";
import {RelationViewProps} from "@/components/relation/relation-view";
import {cn} from "@/lib/utils";

export interface RelationViewTableContentProps extends RelationViewProps {
    columnViewIndices: number[];
}

export function TableContent(props: RelationViewTableContentProps) {

    const relationData = props.relationState.data!;
    const columnViewIndices = props.columnViewIndices;
    const styleMarginRight = props.embedded ? 'mr-0' : 'mr-32';
    return (
        <table
            className={cn("text-sm bg-inherit text-left rtl:text-right text-muted-foreground w-fit h-fit mr-32", styleMarginRight)}
            style={{
                tableLayout: "fixed",
                borderCollapse: "collapse",
            }}
        >
            <TableHead {...props} />
            <tbody className={'bg-inherit'}>
            {relationData.rows.map((row, index) => (
                <TableRow
                    key={index}
                    tableState={props.relationState.viewState.tableState}
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