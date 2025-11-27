import React from 'react';
import { formatNumber } from "@/platform/number-utils";

interface NonNullChartProps {
    nonNullCount: number;
    className?: string;
}

export function ColumnStatsViewNull({ nonNullCount, className }: NonNullChartProps) {
    return (
        <div className={className}>
            <div className="h-full w-full flex flex-col items-center justify-center p-4 space-y-2">
                <div className="text-sm text-muted-foreground font-medium">
                    Non-Null Count
                </div>
                <div className="text-2xl font-bold text-foreground">
                    {formatNumber(nonNullCount)}
                </div>
                <div className="text-xs text-muted-foreground">
                    values
                </div>
            </div>
        </div>
    );
}
