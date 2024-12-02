import {DataSourceGroup} from "@/model/connection";


export interface SchemaState extends DataSourceGroup {
    databaseId: string;
    connectionId: string;
}

export function getSchemaId(connectionId: string, tableId: string, schema: DataSourceGroup): string {
    return `schema-${connectionId}-${tableId}-${schema.id}`;
}