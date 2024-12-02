import {ViewHeader} from "@/components/basics/basic-view/view-header";
import {useRelationsState} from "@/state/relations.state";
import {shallow} from "zustand/shallow";
import {SchemaTableView} from "@/components/schema/schema-table-view";
import {DataSourceElement} from "@/model/connection";

interface SchemaViewProps {
    schemaId: string;
}

export function SchemaView(props: SchemaViewProps) {

    const schema = useRelationsState((state) => state.getSchemaState(props.schemaId), shallow);
    // https://duckdb.org/docs/sql/meta/information_schema.html#table_constraints-table-constraints
    console.log(schema, 'schema', props.schemaId)
    return (
        <div className="w-full h-full flex flex-col">
            <ViewHeader title={schema.name} subtitle={schema.databaseId}/>
            <div className="p-4 flex overflow-auto space-x-4 flex-row w-full h-full">
                {schema.children!.map((table, index) => (
                    <SchemaTableView
                        schema={schema}
                        table={table as DataSourceElement}
                        key={index
                    }/>
                ))}
            </div>
        </div>
    )
}