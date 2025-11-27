import React from 'react';
import { formatNumber, formatDateShort } from "@/platform/number-utils";

interface MinMaxChartProps {
    min: number | string;
    max: number | string;
    nonNullCount: number;
    className?: string;
}

export function ColumnStatsViewMinMax({ min, max, nonNullCount, className }: MinMaxChartProps) {
    const isDate = typeof min === 'number' && typeof max === 'number' &&
                   min > 1000000000000 && max > 1000000000000; // Likely timestamps

    const formatValue = (value: number | string) => {
        if (typeof value === 'number') {
            if (isDate) {
                return formatDateShort(new Date(value));
            }
            return formatNumber(value);
        }
        return String(value);
    };

    const minFormatted = formatValue(min);
    const maxFormatted = formatValue(max);

    return (
        <div className={className}>
            <div className="h-full w-full flex flex-col items-center justify-center p-4 space-y-3">
                <div className="text-sm text-muted-foreground font-medium">
                    Range
                </div>

                <div className="w-full flex items-center justify-between space-x-4">
                    <div className="flex-1 text-center">
                        <div className="text-xs text-muted-foreground mb-1">Min</div>
                        <div className="text-sm font-semibold text-foreground break-all" title={String(min)}>
                            {minFormatted}
                        </div>
                    </div>

                    <div className="text-muted-foreground">→</div>

                    <div className="flex-1 text-center">
                        <div className="text-xs text-muted-foreground mb-1">Max</div>
                        <div className="text-sm font-semibold text-foreground break-all" title={String(max)}>
                            {maxFormatted}
                        </div>
                    </div>
                </div>

                <div className="text-xs text-muted-foreground">
                    {formatNumber(nonNullCount)} non-null values
                </div>
            </div>
        </div>
    );
}
