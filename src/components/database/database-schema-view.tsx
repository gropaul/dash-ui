import {DataSourceGroup} from "@/model/data-source-connection";
import {CardView} from "@/components/basics/basic-view/card-view";
import React from "react";
import {RelationSourceTable} from "@/model/relation";
import {useRelationsState} from "@/state/relations.state";
import {Database, ExternalLink, Network} from "lucide-react";
import {DEFAULT_RELATION_VIEW_PATH} from "@/platform/global-data";


interface DatabaseSchemaViewProps {
    connectionId: string;
    databaseId: string;
    databaseName: string;
    schema: DataSourceGroup;
}

export function DatabaseSchemaView(props: DatabaseSchemaViewProps) {

    const showRelation = useRelationsState((state) => state.showRelationFromSource);
    const showSchema = useRelationsState((state) => state.showSchema);

    function onShowSchema() {
        showSchema(props.connectionId, props.databaseName, props.schema);
    }

    function onShowRelation(tableName: string) {
        const relationSourceTable: RelationSourceTable = {
            type: 'table',
            database: props.databaseName,
            schema: props.schema.name,
            tableName: tableName,
        }
        showRelation(props.connectionId, relationSourceTable, DEFAULT_RELATION_VIEW_PATH);
    }


    return (
        <CardView
            header={
                <div className="flex items-center">
                    <Network size={16} className="mr-2"/>
                    {props.schema.name}
                </div>
            }
            headerButtons={
                <ExternalLink
                    size={16}
                    className="text-gray-500 hover:text-gray-700 flex-shrink-0"
                    onClick={onShowSchema}
                />
            }
        >
            <div className={'flex flex-col space-y-0.5'}>
                {props.schema.children!.map((table, index) => (
                    <div
                        key={table.name}
                        className="group flex items-center justify-between px-4 py-0.5 border-gray-100"
                    >
                        <div className="flex-1 flex items-center space-x-2 overflow-hidden pr-1">
                            <Database size={16}/>
                            <span
                                className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
                                title={table.name}
                            >
                          {table.name}
                        </span>
                        </div>
                        <ExternalLink
                            size={16}
                            className="text-gray-500 hover:text-gray-700 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => onShowRelation(table.name)}
                        />
                    </div>

                ))}
            </div>
        </CardView>
    )
}