'use client';

import {useRelationsState} from "@/state/relations.state";

export function RelationListView() {
    const tables = useRelationsState((state) => state.relations);
    const relation_names = tables.map((table) => table.name);

    // show a list of the tables
    return (
        <div className="border-t border-gray-200 dark:border-gray-700">
            <ul>
                {relation_names.map((name, index) => {
                    return <li
                        key={index}
                        className="p-2 border-b border-gray-200 dark:border-gray-700"
                    >
                        {name}
                    </li>
                })}
            </ul>
        </div>
    )
}