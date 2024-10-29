import { Relation } from "@/model/relation";
import { RowView } from "@/components/relation/row-view";
import React from "react";
import {ColumnHead, ColumnHeadWrapper} from "@/components/relation/column-head";

export interface ColumnDisplayState {
    width: number;
    wrapContent: boolean;
}

export interface RelationDisplayState {
    columnStates: ColumnDisplayState[];
}

export interface RelationViewProps {
    relation: Relation;
    displayState?: RelationDisplayState;
}

export function getInitialDisplayState(relation: Relation): RelationDisplayState {
    return {
        columnStates: relation.columns.map(() => ({
            width: 300,
            wrapContent: false,
        })),
    };
}

export function RelationView(props: RelationViewProps) {
    const [localState, setLocalState] = React.useState<RelationDisplayState>(
        props.displayState || getInitialDisplayState(props.relation)
    );

    // Update local state when display state changes
    React.useEffect(() => {
        if (props.displayState) {
            setLocalState(props.displayState);
        }
    }, [props.displayState]);

    return (
        <div className="relative overflow-y-auto h-full"> {/* Set a height for scrollable area */}
            <table
                className="text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 w-fit"
                style={{
                    tableLayout: "fixed",
                    borderCollapse: "collapse",}}
            >
                <thead className="border-0 text-s text-gray-700 bg-white dark:bg-black dark:text-gray-400 sticky top-0 z-20">
                <tr>
                    {/* Row index column header, should fit the cells with*/}
                    <th
                        scope="col"
                        className="p-0 m-0 h-8 sticky left-0 z-10 bg-white dark:bg-black dark:text-gray-400"
                        style={{width: '64px', overflow: 'hidden'}}
                    >
                        <div
                            className="w-full h-full absolute right-0 top-0 z-50 border-r border-b border-gray-700 dark:border-gray-700"
                        />


                    </th>
                    {/* Column headers */}
                    {props.relation.columns.map((column, index) => (
                        <ColumnHead
                            key={index}
                            column={column}
                            columnIndex={index}
                            displayState={localState}
                            setDisplayState={setLocalState}
                        />
                    ))}
                </tr>
                </thead>
                <tbody>
                    {props.relation.rows.map((row, index) => (
                        <RowView key={index} rowIndex={index} row={row} displayState={localState}/>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
