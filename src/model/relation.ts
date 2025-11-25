import {Column} from "@/model/data-source-connection";

export type Row = any[]

export interface RelationData {
    columns: Column[]
    rows: Row[]
}

export function GetColumnIndexByName(relation: RelationData, columnName: string): number {
    const columnIndex = relation.columns.findIndex((column) => column.name === columnName);
    if (columnIndex === -1) {
        throw new Error(`Column ${columnName} not found in relation`);
    }
    return columnIndex;
}

export function RelationDataToMarkdown(relation: RelationData): string {
    if (relation.rows.length === 0) {
        return 'Empty relation, Columns: ' + relation.columns.map((column) => column.name).join(', ');
    }
    const columnNames = relation.columns.map((column) => column.name).join(' | ');
    const separator = relation.columns.map(() => '---').join(' | ');
    const rows = relation.rows.map((row) => row.map((value) => String(value)).join(' | ')).join('\n');
    return `| ${columnNames} |\n| ${separator} |\n| ${rows} |`;
}

export function PrintRelationData(relation: RelationData): string {
    const columnNames = relation.columns.map((column) => column.name).join(', ');
    const rows = relation.rows.map((row) => row.join(', ')).join('\n');
    return `Columns: ${columnNames}\nRows:\n${rows}`;
}

export type RelationType = 'table' | 'file' | 'query'

export interface RelationSourceTable {
    type: 'table',
    database: string,
    schema: string,
    tableName: string,
}

export interface RelationSourceFile {
    type: 'file',
    path: string,
    baseName: string,
}

export interface RelationSourceQuery {
    type: 'query',
    id: string,
    name: string,
    baseQuery: string,
}

export type RelationSource = RelationSourceTable | RelationSourceFile | RelationSourceQuery

export interface Relation {
    name: string,
    connectionId: string,
    source: RelationSource,
    id: string,
}

export function getPathFromRelation(source: RelationSource, connectionId: string): string[] {

    if (source.type == 'file'){
        return [connectionId, source.baseName]
    } else  if (source.type == 'query') {
        return [connectionId]
    } else if (source.type == 'table') {
        return [connectionId, source.database, source.schema, source.tableName]
    } else {
        throw new Error(`Unknown relation type: ${source}`);
    }
}


export function getRelationIdFromSource(connectionId: string, source: RelationSource): string {
    if (source.type === 'table') {
        return `relation-table-${connectionId}-${source.database}-${source.schema}-${source.tableName}`;
    } else if (source.type === 'file') {
        return `relation-file-${connectionId}-${source.path}`;
    } else if (source.type === 'query') {
        return `relation-query-${connectionId}-${source.id}`;
    } else {
        throw new Error(`Unknown relation type: ${source}`);
    }
}

export function getRelationNameFromSource(source: RelationSource): string {
    if (source.type === 'table') {
        return `${source.tableName} View`;
    } else if (source.type === 'file') {
        return `${source.baseName} View`;
    } else if (source.type === 'query') {
        return source.name;
    } else {
        throw new Error(`Unknown relation type: ${source}`);
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