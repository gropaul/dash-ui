import {Column} from "@/model/column";

export type Row = any[]

export interface RelationData {
    columns: Column[]
    rows: Row[]
}

export interface Relation extends RelationData {
    connectionId: string,
    database: string,
    schema: string,
    name: string,
    id: string,
}

export function getRelationId(connectionId: string, database: string , schema: string, relationName: string): string {
    return `relation-${connectionId}-${database}-${schema}-${relationName}`;
}

export function getColumnNames(relation: Relation): string[] {
    return relation.columns.map((column) => column.name);
}

export function getColumnIndices(relation: RelationData, columns: string[]): number[] {
    return columns.map((column) => {
        const index = relation.columns.findIndex((col) => col.name === column);
        if (index === -1) {
            throw new Error(`Column ${column} not found in relation`);
        }
        return index;
    });
}

export function getRows(relation: RelationData, columns: string[]): Row[] {

    // return empty array if no columns are provided
    if (relation.rows.length === 0) {
        return [];
    }

    const column_indices = getColumnIndices(relation, columns);

    return relation.rows.map((row) => {
        return column_indices.map((index) => row[index]);
    });
}

export function iterateColumns(relation: RelationData, columns: string[], callback: (values: any[]) => void) {
    const column_indices = getColumnIndices(relation, columns);

    relation.rows.forEach((row) => {
        const values = column_indices.map((index) => row[index]);
        callback(values);
    });
}

export function getTestRelation(): Relation {
    return {
        id: getRelationId('Test Connection', 'Test Database', 'Test Schema', 'Test Relation'),
        connectionId: 'Test Connection',
        database: 'Test Database',
        name: 'Test Relation',
        schema: 'Test Schema',
        columns: [
            {
                name: 'Column 1',
                type: 'Integer',
            },
            {
                name: 'Column 2',
                type: 'String',
            }
        ],
        rows: [
            [1, "This"],
            [2, "is"],
            [3, "a"],
            [4, "test"],
        ]
    }
}

