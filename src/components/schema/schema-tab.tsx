import {ViewHeader} from "@/components/basics/basic-view/view-header";
import {useRelationsState} from "@/state/relations.state";
import {shallow} from "zustand/shallow";
import {SchemaRelationView} from "@/components/schema/schema-relation-view";
import {DataSourceElement} from "@/model/connection";
import {GetPathOfSchema} from "@/model/schema-state";

interface SchemaViewProps {
    schemaId: string;
}

export function SchemaTab(props: SchemaViewProps) {

    const schema = useRelationsState((state) => state.getSchemaState(props.schemaId), shallow);
    // todo display schema constraints
    // https://duckdb.org/docs/sql/meta/information_schema.html#table_constraints-table-constraints
    if (!schema) {
        return <div>Schema not found: {props.schemaId}</div>
    }
    return (
        <div className="w-full h-full flex flex-col">
            <ViewHeader title={schema.name} path={GetPathOfSchema(schema)}/>
            <div className="p-4 flex overflow-auto space-x-4 flex-row w-full h-full">
                {schema.children!.map((table, index) => (
                    <SchemaRelationView
                        schema={schema}
                        table={table as DataSourceElement}
                        key={index
                    }/>
                ))}
            </div>
        </div>
    )
}