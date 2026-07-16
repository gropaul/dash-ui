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
    // custom accent color (hex) for data-bar / color-scale / text-color,
    // undefined -> theme primary color. Not used by 'badge', which derives a
    // deterministic color per value (see colorForCategory).
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

/** Canonical string key for a categorical value (badge color lookup). */
export function categoryKey(value: any): string {
    return value === null || value === undefined ? '' : String(value);
}

/**
 * Deterministic accent color for a categorical value, picked from the given
 * palette by hashing the value's string form. The same value always maps to the
 * same color, but distinct values can collide. Used as the fallback for values
 * not covered by a sampled buildCategoryColorMap.
 */
export function colorForCategory(value: any, palette: string[]): string {
    const key = categoryKey(value);
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = (hash * 31 + key.charCodeAt(i)) | 0;
    }
    return palette[Math.abs(hash) % palette.length];
}

/**
 * Builds a collision-free value -> color map by assigning palette colors to the
 * first `maxEntries` distinct values in encounter order (from a sample of the
 * column's values). The first `palette.length` distinct values are guaranteed
 * unique colors; beyond that the palette cycles. Values not present here should
 * fall back to colorForCategory.
 */
export function buildCategoryColorMap(values: any[], palette: string[], maxEntries = 100): Map<string, string> {
    const map = new Map<string, string>();
    for (const value of values) {
        const key = categoryKey(value);
        if (map.has(key)) continue;
        if (map.size >= maxEntries) break;
        map.set(key, palette[map.size % palette.length]);
    }
    return map;
}

/** Normalized position of a value in [min, max], clamped to [0, 1]. */
export function normalizeInRange(value: any, min?: number, max?: number): number | null {
    const num = toNumeric(value);
    if (num === null || isNaN(num) || min === undefined || max === undefined) return null;
    if (max === min) return 1;
    return Math.min(1, Math.max(0, (num - min) / (max - min)));
}
