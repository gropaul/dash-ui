import React from 'react';
import { ColumnStats as ColumnStatsType } from '@/model/relation-state';
import { HistogramChart } from './HistogramChart';
import { TopNChart } from './TopNChart';
import { MinMaxChart } from './MinMaxChart';
import { NonNullChart } from './NonNullChart';
import {ErrorBoundary} from "@/components/basics/error-bundary";
import {cn} from "@/lib/utils";

interface ColumnStatsProps {
    stats?: ColumnStatsType;
    className?: string;
}

export function ColumnStatsView({ stats, className }: ColumnStatsProps) {

    return (
        <div className={className}>
            <ErrorBoundary
                fallback={(err) => (
                    <div className={cn('flex items-center justify-center text-muted-foreground h-full')}>
                        Could not load column stats: {err.message}
                    </div>
                )}
            >
                <ColumnsStatsViewContent stats={stats} className={'h-full w-full'} />
            </ErrorBoundary>
        </div>
    );


}

function ColumnsStatsViewContent({ stats, className }: ColumnStatsProps) {
    if (!stats) {
        return (
            <div className={cn(className, 'flex items-center justify-center text-muted-foreground')}>
                No Stats Available
            </div>
        );
    }
    switch (stats.type) {
        case 'histogram':
            return (
                <HistogramChart
                    dataType={stats.histogramType}
                    className={className}
                    histogramData={stats.values}
                />
            );
        case 'top-n':
            return (
                <TopNChart
                    className={className}
                    topValues={stats.topValues}
                    othersCount={stats.othersCount}
                    nonNullCount={stats.nonNullCount}
                />
            );
        case 'minMax':
            return (
                <MinMaxChart
                    className={className}
                    min={stats.min}
                    max={stats.max}
                    nonNullCount={stats.nonNullCount}
                />
            );
        case 'non_null':
            return (
                <NonNullChart
                    className={className}
                    nonNullCount={stats.nonNullCount}
                />
            );
        default:
            return (
                <div className={className}>
                    Unknown Stats Type
                </div>
            );
    }
}
