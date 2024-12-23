import {DataSourceGroup} from "@/model/connection";
import {DatabaseState} from "@/model/database-state";


export interface SchemaState extends DataSourceGroup {
    databaseId: string;
    connectionId: string;
}

export function getSchemaId(connectionId: string, tableId: string, schema: DataSourceGroup): string {
    return `schema-${connectionId}-${tableId}-${schema.id}`;
}

export function GetPathOfSchema(schema: SchemaState): string[] {
    return [schema.connectionId, schema.databaseId, schema.name]
}