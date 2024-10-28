'use client';

import {useRelationsState} from "@/state/relations.state";
import React from "react";

export function RelationsOverview() {
    const tables = useRelationsState((state) => state.relations);
    const relation_names = tables.map((table) => table.name);

    // show a list of the tables, have a light grey background
    return (
        <div className="bg-gray-50 h-full">
            <div style={{height: 32}} className=" uppercase flex items-center p-2 border-gray-200 font-bold">
                Relations
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700">
                <ul>
                    {relation_names.map((name, index) => {
                        return <li
                            key={index}
                            className="p-2 text-s border-b border-gray-200 dark:border-gray-700"
                        >
                            {name}
                        </li>
                    })}
                </ul>
            </div>
        </div>

    )
}