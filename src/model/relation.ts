import {Column} from "@/model/column";

export type Row = any[]

export interface RelationData {
    columns: Column[]
    rows: Row[]
}

export type RelationSourceType = 'table' | 'file';

export interface RelationSourceTable {
    type: 'table',
    database: string,
    schema: string,
    tableName: string,
}

export interface RelationSourceFile {
    type: 'file',
    path: string,
    base_name: string,
}

export type RelationSource = RelationSourceTable | RelationSourceFile;

export interface Relation {
    name: string,
    connectionId: string,
    source: RelationSource,
    id: string,
    data?: RelationData, // can be undefined if query still running
}


export function getRelationIdFromSource(connectionId: string, source: RelationSource): string {
    if (source.type === 'table') {
        return `relation-table-${connectionId}-${source.database}-${source.schema}-${source.tableName}`;
    } else {
        return `relation-file-${connectionId}-${source.path}`;
    }
}

export function getRelationNameFromSource(relation: RelationSource): string {
    if (relation.type === 'table') {
        return relation.database;
    } else {
        return relation.base_name;
    }
}

export function getColumnNames(data: RelationData): string[] {
    return data.columns.map((column) => column.name);
}

export function getColumnIndices(data: RelationData, columns: string[]): number[] {
    return columns.map((column) => {
        const index = data.columns.findIndex((col) => col.name === column);
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

    const source: RelationSource = {
        type: 'table',
        database: 'Test Database',
        schema: 'Test Schema',
        tableName: 'Test Relation',
    }

    return {
        name: getRelationNameFromSource(source),
        id: getRelationIdFromSource('Test Connection', source),
        connectionId: 'Test Connection',
        source: source,
        data: {
            columns: [
                {
                    id: 'Column 1',
                    name: 'Column 1',
                    type: 'Integer',
                },
                {
                    id: 'Column 2',
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
}

