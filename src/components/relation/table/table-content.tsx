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

export const TableContent = React.memo(function TableContent(props: RelationViewTableContentProps) {
    const {data, columnViewIndices, relationState, embedded} = props;

    const limitRows = relationState.query.viewParameters.table.limit;
    const offset = relationState.lastExecutionMetaData?.lastResultOffset || 0;

    const columns = React.useMemo(() => data.columns, [data.columns]);
    const viewIndices = React.useMemo(() => columnViewIndices, [columnViewIndices]);
    const rowsSlice = React.useMemo(() => data.rows.slice(0, limitRows), [data.rows, limitRows]);

    const styleMarginRight = embedded ? "mr-0" : "mr-32";

    return (
        <table
            className={cn(
                "text-sm bg-inherit text-left rtl:text-right text-muted-foreground w-fit h-fit mr-32",
                styleMarginRight
            )}
            style={{tableLayout: "fixed", borderCollapse: "collapse"}}
        >
            <TableHead {...props} />
            <tbody className="bg-inherit">
            {rowsSlice.map((row, index) => (
                <TableRow
                    key={index}
                    rowIndex={index}
                    row={row}
                    columns={columns}
                    offset={offset}
                    columnViewIndices={viewIndices}
                />
            ))}
            </tbody>
        </table>
    );
});