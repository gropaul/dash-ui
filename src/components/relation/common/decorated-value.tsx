import React from "react";
import {cn} from "@/lib/utils";
import {
    ColumnDecoration,
    DecorationAlign,
    formatDecoratedValue,
    normalizeInRange,
} from "@/model/relation-view-state/decoration";

const ALIGN_CLASS: Record<DecorationAlign, string> = {
    left: 'justify-start text-left',
    center: 'justify-center text-center',
    right: 'justify-end text-right',
};

export interface DecoratedValueProps {
    value: any;
    // raw display string, used as-is for format 'plain' or non-numeric values
    fallbackString: string;
    decoration: ColumnDecoration;
    // column-wide range for data-bar / color-scale styles
    rangeMin?: number;
    rangeMax?: number;
    className?: string;
}

/**
 * Renders a single value with a column decoration applied (format, align,
 * cell style). Shared between table cells and the decoration editor preview.
 */
export const DecoratedValue = React.memo(function DecoratedValue(props: DecoratedValueProps) {
    const {value, fallbackString, decoration, rangeMin, rangeMax, className} = props;
    const text = formatDecoratedValue(value, fallbackString, decoration.format);
    const alignClass = ALIGN_CLASS[decoration.align] ?? ALIGN_CLASS.left;
    const color = decoration.color;
    const isNull = value === null || value === undefined;

    if (!isNull && decoration.style === 'data-bar') {
        const normalized = normalizeInRange(value, rangeMin, rangeMax);
        return (
            <div className={cn("relative flex min-h-5 items-center overflow-hidden rounded-sm", alignClass, className)}>
                {normalized !== null && (
                    <div
                        className={cn("absolute inset-y-0 left-0 rounded-sm", color ? undefined : "bg-primary")}
                        style={{
                            width: `${Math.round(normalized * 100)}%`,
                            backgroundColor: color,
                            opacity: 0.25,
                        }}
                    />
                )}
                <span className="relative truncate px-1" style={{color}}>{text}</span>
            </div>
        );
    }

    if (!isNull && decoration.style === 'color-scale') {
        const normalized = normalizeInRange(value, rangeMin, rangeMax);
        return (
            <div className={cn("relative flex min-h-5 items-center overflow-hidden rounded-sm", alignClass, className)}>
                {normalized !== null && (
                    <div
                        className={cn("absolute inset-0", color ? undefined : "bg-primary")}
                        style={{
                            backgroundColor: color,
                            opacity: 0.05 + normalized * 0.35,
                        }}
                    />
                )}
                <span className="relative truncate px-1">{text}</span>
            </div>
        );
    }

    if (!isNull && decoration.style === 'badge') {
        return (
            <div className={cn("flex min-h-5 items-center", alignClass, className)}>
                <span
                    className={cn(
                        "inline-block max-w-full truncate rounded-full px-2 py-0.5 text-xs",
                        color ? undefined : "bg-secondary text-secondary-foreground",
                    )}
                    style={color ? {
                        color,
                        backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
                    } : undefined}
                >
                    {text}
                </span>
            </div>
        );
    }

    return (
        <div className={cn("flex min-h-5 items-center", alignClass, className)}>
            <span
                className={cn("truncate", !isNull && decoration.style === 'text-color' && !color && "text-primary")}
                style={!isNull && decoration.style === 'text-color' ? {color} : undefined}
            >
                {text}
            </span>
        </div>
    );
});
