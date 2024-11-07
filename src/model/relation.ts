import {Column} from "@/model/column";
import {v4 as uuidv4} from "uuid";

export type Row = any[]

export interface Relation {
    name: string,
    id: string,
    columns: Column[]
    rows: Row[]
}

export function getRelationId(connectionId: string, relationName: string): string {
    return 'relation-' + connectionId + '-' + relationName;
}

export function getColumnNames(relation: Relation): string[] {
    return relation.columns.map((column) => column.name);
}

export function getColumnIndices(relation: Relation, columns: string[]): number[] {
    return columns.map((column) => {
        const index = relation.columns.findIndex((col) => col.name === column);
        if (index === -1) {
            throw new Error(`Column ${column} not found in relation ${relation.name}`);
        }
        return index;
    });
}

export function getRows(relation: Relation, columns: string[]): Row[] {
    const column_indices = getColumnIndices(relation, columns);

    return relation.rows.map((row) => {
        return column_indices.map((index) => row[index]);
    });
}

export function iterateColumns(relation: Relation, columns: string[], callback: (values: any[]) => void) {
    const column_indices = getColumnIndices(relation, columns);

    relation.rows.forEach((row) => {
        const values = column_indices.map((index) => row[index]);
        callback(values);
    });
}

export function getTestRelation() : Relation {
    return {
        id: getRelationId('Test Connection', 'Test Relation'),
        name: 'Test Relation',
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

