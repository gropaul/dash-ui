import {DataSourceGroup} from "@/model/connection";


export interface DatabaseState extends DataSourceGroup {
    connectionId: string;
}

export function getDatabaseId(connectionId: string, databaseId: string): string {
    return `database-${connectionId}-${databaseId}`;
}

export function GetPathOfDatabase(db: DatabaseState): string[] {
    return [db.connectionId, db.name]
}