import {ValueType} from "@/model/value-type";

/**
 * View-agnostic column decoration: how a single column's values are
 * formatted and styled. Used by the table view; designed to be reusable
 * by other column-oriented views (text, select, markdown).
 */

export type DecorationFormat = 'plain' | 'number' | 'currency' | 'percent';
export type DecorationAlign = 'left' | 'center' | 'right';
export type DecorationCellStyle = 'none' | 'data-bar' | 'color-scale' | 'badge' | 'text-color';

export interface ColumnDecoration {
    format: DecorationFormat;
    align: DecorationAlign;
    style: DecorationCellStyle;
    // custom accent color (hex) for data-bar / color-scale / badge / text-color,
    // undefined -> theme primary color
    color?: string;
}

export const DEFAULT_COLUMN_DECORATION: ColumnDecoration = {
    format: 'plain',
    align: 'left',
    style: 'none',
}

export function isNumericType(type: ValueType): boolean {
    return type === 'Integer' || type === 'Float';
}

export function isDecoratableType(type: ValueType): boolean {
    return type !== 'List' && type !== 'Map' && type !== 'Struct';
}

export function getAvailableFormats(type: ValueType): DecorationFormat[] {
    return isNumericType(type) ? ['plain', 'number', 'currency', 'percent'] : ['plain'];
}

export function getAvailableStyles(type: ValueType): DecorationCellStyle[] {
    if (isNumericType(type)) return ['none', 'data-bar', 'color-scale', 'text-color'];
    if (type === 'String' || type === 'Boolean') return ['none', 'badge', 'text-color'];
    return ['none', 'text-color'];
}

export function hasNonDefaultDecoration(decoration?: ColumnDecoration): boolean {
    if (!decoration) return false;
    return decoration.format !== 'plain'
        || decoration.align !== 'left'
        || decoration.style !== 'none';
}

/**
 * "Styled" as signalled in the column list (tinted type icon): a cell style or
 * a changed format. Alignment alone does not count.
 */
export function isStyledDecoration(decoration?: ColumnDecoration): boolean {
    if (!decoration) return false;
    return decoration.style !== 'none' || decoration.format !== 'plain';
}

/** Style needs a numeric range (min/max over the column values) to render. */
export function styleNeedsRange(style: DecorationCellStyle): boolean {
    return style === 'data-bar' || style === 'color-scale';
}

/** DuckDB returns BigInt for large integer types; normalize for math/formatting. */
export function toNumeric(value: any): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    return null;
}

const numberFormatter = new Intl.NumberFormat(undefined, {maximumFractionDigits: 2});
const currencyFormatter = new Intl.NumberFormat(undefined, {style: 'currency', currency: 'USD'});

export function formatDecoratedValue(value: any, fallback: string, format: DecorationFormat): string {
    if (format === 'plain') return fallback;
    const num = toNumeric(value);
    if (num === null || isNaN(num)) return fallback;
    switch (format) {
        case 'number':
            return numberFormatter.format(num);
        case 'currency':
            return currencyFormatter.format(num);
        case 'percent':
            return numberFormatter.format(num) + '%';
    }
}

/** Normalized position of a value in [min, max], clamped to [0, 1]. */
export function normalizeInRange(value: any, min?: number, max?: number): number | null {
    const num = toNumeric(value);
    if (num === null || isNaN(num) || min === undefined || max === undefined) return null;
    if (max === min) return 1;
    return Math.min(1, Math.max(0, (num - min) / (max - min)));
}
