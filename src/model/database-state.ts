import {DataSourceGroup} from "@/model/data-source-connection";


export interface DatabaseState extends DataSourceGroup {
    connectionId: string;
    databaseId: string;
}

export function getDatabaseId(connectionId: string, databaseId: string): string {
    return `database-${connectionId}-${databaseId}`;
}

export function GetPathOfDatabase(db: DatabaseState): string[] {
    return [db.connectionId, db.name]
}