import {DatabaseConnection} from "@/model/database-connection";
import {RelationZustand, useRelationsState} from "@/state/relations.state";


export async function onDatabaseAttached(
    connection: DatabaseConnection,
    database_name: string,
) {
    // get the schema now with the new database, look for schema dash and table relationState
    const tables = await connection.executeQuery(` SELECT table_catalog, table_schema, table_name
                                                   FROM information_schema.tables
                                                   WHERE table_catalog = '${database_name}'
                                                     AND table_schema = 'dash'
                                                     AND table_name = 'relationState'`);

    if (tables.rows.length > 0) {
        const table = tables.rows[0];
        const tableCatalog = table[0] as string;
        const tableSchema = table[1] as string;
        const tableName = table[2] as string;

        // get the relationState
        const relationState = await connection.executeQuery(`SELECT id, value, version FROM ${tableCatalog}.${tableSchema}.${tableName}`);
        const json_value_string = relationState.rows[0][1] as string;

        const json_value = JSON.parse(json_value_string);
        // this is a relationState json
        const importedRelationZustand: RelationZustand = json_value as RelationZustand;

        // insert the relationState into the zustand store
        useRelationsState.getState().importState(importedRelationZustand);

    }

}