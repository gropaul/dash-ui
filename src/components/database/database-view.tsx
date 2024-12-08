import {ViewHeader} from "@/components/basics/basic-view/view-header";
import {shallow} from "zustand/shallow";
import {useRelationsState} from "@/state/relations.state";
import {DatabaseSchemaView} from "@/components/database/database-schema-view";
import {DataSourceGroup} from "@/model/connection";

interface DatabaseViewProps {
    databaseId: string;
}

export function DatabaseView(props: DatabaseViewProps) {

    const database = useRelationsState((state) => state.getDatabaseState(props.databaseId), shallow);
    console.log('databaseId:', props.databaseId)

    if (!database) {
        return <div>Database not found: {props.databaseId}</div>
    }

    return (
        <div className="w-full h-full flex flex-col">
            <ViewHeader title={database.name} subtitle={database.connectionId}/>
            <div className="p-4 flex overflow-auto space-x-4 flex-row w-full h-full">
                {database.children!.map((schema, index) => (
                    <DatabaseSchemaView
                        key={index}
                        connectionId={database.connectionId}
                        databaseId={props.databaseId}
                        databaseName={database.name}
                        schema={schema as DataSourceGroup}
                    />
                ))}
            </div>
        </div>
    )
}