import {TableRow} from "@/components/relation/table/table-row";
import React from "react";
import {TableHead} from "@/components/relation/table/table-head";
import {RelationViewProps} from "@/components/relation/relation-view";
import {cn} from "@/lib/utils";
import {useRelationData} from "@/state/relations-data.state";
import {RelationData} from "@/model/relation";

export interface RelationViewTableContentProps extends RelationViewProps {
    columnViewIndices: number[];
    data: RelationData;
}

export function TableContent(props: RelationViewTableContentProps) {

    const data = props.data;
    const columnViewIndices = props.columnViewIndices;
    const styleMarginRight = props.embedded ? 'mr-0' : 'mr-32';
    const limitRows = props.relationState.query.viewParameters.table.limit
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
            {data.rows.slice(0, limitRows).map((row, index) => (
                <TableRow
                    key={index}
                    tableState={props.relationState.viewState.tableState}
                    rowIndex={index}
                    row={row}
                    columns={data.columns}
                    offset={props.relationState.lastExecutionMetaData?.lastResultOffset || 0}
                    columnViewIndices={columnViewIndices}
                />
            ))}
            </tbody>
        </table>
    )
}