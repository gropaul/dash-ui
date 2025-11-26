import React from 'react';
import { ColumnStats as ColumnStatsType } from '@/model/relation-state';
import { HistogramChart } from './HistogramChart';
import { TopNChart } from './TopNChart';
import { MinMaxChart } from './MinMaxChart';
import { NonNullChart } from './NonNullChart';

interface ColumnStatsProps {
    stats?: ColumnStatsType;
    className?: string;
}

export function ColumnStatsView({ stats, className }: ColumnStatsProps) {
    if (!stats) {
        return (
            <div className={'h-32 w-full flex items-center justify-center text-muted-foreground'}>
                No Stats Available
            </div>
        );
    }

    switch (stats.type) {
        case 'histogram':
            return (
                <HistogramChart
                    dataType={stats.histogramType}
                    className={className ?? "h-32 w-full"}
                    histogramData={stats.values}
                />
            );
        case 'top-n':
            return (
                <TopNChart
                    className={className ?? "h-32 w-full"}
                    topValues={stats.topValues}
                    othersCount={stats.othersCount}
                    nonNullCount={stats.nonNullCount}
                />
            );
        case 'minMax':
            return (
                <MinMaxChart
                    className={className ?? "h-32 w-full"}
                    min={stats.min}
                    max={stats.max}
                    nonNullCount={stats.nonNullCount}
                />
            );
        case 'non_null':
            return (
                <NonNullChart
                    className={className ?? "h-32 w-full"}
                    nonNullCount={stats.nonNullCount}
                />
            );
        default:
            return (
                <div className={'h-32 w-full flex items-center justify-center text-muted-foreground'}>
                    Unknown Stats Type
                </div>
            );
    }
}
