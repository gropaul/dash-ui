import {Relation} from "@/model/relation";
import {RowView} from "@/components/relation/row-view";
import React from "react";

export interface RelationViewPops {
    relation: Relation
}

export function RelationView(props: RelationViewPops) {
    return (
        <div className="relative overflow-x-auto sm:rounded-lg ">
            <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    {props.relation.columns.map((column, index) => {
                        return <th key={index} scope="col" className="px-2 py-2">
                            {column.name}
                        </th>
                    })}
                </tr>
                </thead>
                <tbody>
                    {
                        props.relation.rows.map((row,index) => {
                            return <RowView key={index} row={row}/>
                        })
                    }
                </tbody>
            </table>
        </div>
    )
}