import {DataSourceGroup} from "@/model/connection";


export interface DatabaseState extends DataSourceGroup {
    connectionId: string;
}

export function getDatabaseId(connectionId: string, database: DataSourceGroup): string {
    return `database-${connectionId}-${database.id}`;
}