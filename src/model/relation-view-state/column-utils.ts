import {RelationData} from "@/model/relation";
import {Column} from "@/model/data-source-connection";

/**
 * Check if a column type is numeric (suitable for Y-axis values)
 */
export function isNumeric(c: Column): boolean {
    return c.type === 'Integer' || c.type === 'Float';
}

/**
 * Check if a column type is text/categorical
 */
export function isTextType(c: Column): boolean {
    return c.type === 'String';
}

/**
 * Check if a column exists in the available columns
 */
export function columnExists(columnId: string, columns: RelationData['columns']): boolean {
    return columns.some(col => col.id === columnId);
}
