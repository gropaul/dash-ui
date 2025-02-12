import {DataSourceGroup} from "@/model/data-source-connection";


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