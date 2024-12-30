import {DataSourceElement} from "@/model/connection";
import React from "react";
import {SchemaState} from "@/model/schema-state";
import {ExternalLink, Sheet} from "lucide-react";
import {RelationSourceTable} from "@/model/relation";
import {useRelationsState} from "@/state/relations.state";
import {CardView} from "@/components/basics/basic-view/card-view";
import {ValueIcon} from "@/components/relation/common/value-icon";


interface SchemaRelationViewProps {
    schema: SchemaState;
    table: DataSourceElement;
}

export function SchemaRelationView(props: SchemaRelationViewProps) {

    const showRelation = useRelationsState((state) => state.showRelationFromSource);

    function onShowRelation() {
        const relationSourceTable: RelationSourceTable = {
            type: 'table',
            database: props.schema.databaseId,
            schema: props.schema.id,
            tableName: props.table.name,
        }

        showRelation(props.schema.connectionId, relationSourceTable);
    }


    return (
        <CardView
            header={
                <div className="flex items-center">
                    <Sheet size={16} className="mr-2"/>
                    {props.table.name}
                </div>
            }
            headerButtons={
                <ExternalLink
                    size={16}
                    className="text-gray-500 hover:text-gray-700 flex-shrink-0"
                    onClick={onShowRelation}
                />
            }
        >
            {props.table.children!.map((column) => (
                <div key={column.name} className="flex items-center justify-between px-4 py-0.5 border-gray-100">
                    <div className="flex-1 flex items-center space-x-2 overflow-hidden pr-1">
                        <ValueIcon type={column.type}/>
                        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap" title={column.name}>
                            {column.name}
                        </span>
                    </div>
                    {/* Type always fully visible */}
                    <span className="flex-shrink-0 text-gray-500 text-s">
                        {column.type}
                    </span>
                </div>
            ))}
        </CardView>
    )
}