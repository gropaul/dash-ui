import React from "react";
import {TableHead} from "@/components/relation/table/table-head";
import {RelationViewProps} from "@/components/relation/relation-view";
import {cn} from "@/lib/utils";
import {RelationData, Row} from "@/model/relation";
import {TableValueCell} from "@/components/relation/table/table-value-cell";
import {Sometype_Mono} from "next/font/google";


export const fontMono = Sometype_Mono({subsets: ["latin"], weight: "400"});

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
                <tr className={cn(fontMono.className, "bg-inherit hover:bg-muted border-b ")} key={index}>
                    <td
                        className="sticky py-1 left-0 z-[2]  bg-inherit text-muted-foreground text-left"
                    >
                        <div className={'absolute py-1 top-0 left-0 w-full h-full pl-4 border-r pointer-events-none text-left '}>
                            {offset + index + 1}
                        </div>
                    </td>
                    {row.map((value, index) => (
                        <TableValueCell
                            key={index}
                            element={value}
                            column={props.data.columns[index]}
                        />
                    ))
                    }
                </tr>
            ))}
            </tbody>
        </table>
    );
});