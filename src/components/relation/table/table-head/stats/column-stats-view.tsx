import React from 'react';
import {ColumnStats as ColumnStatsType, RelationState} from '@/model/relation-state';
import {ColumnStatsViewHist} from './column-stats-view-hist';
import {ColumnStatsViewTopN} from './column-stats-view-top-n';
import {ColumnStatsViewMinMax} from './column-stats-view-min-max';
import {ColumnStatsViewNull} from './column-stats-view-null';
import {ErrorBoundary} from "@/components/basics/error-bundary";
import {cn} from "@/lib/utils";

export interface ColumnStatsProps {
    stats?: ColumnStatsType;
    className?: string;
    relationState: RelationState
}

export function ColumnStatsView({stats, className, relationState}: ColumnStatsProps) {

    const showStats = relationState.viewState.tableState.showStats;
    if (showStats) {
        return <></>
        return <div className={cn("w-full h-6 flex items-center justify-center")}></div>;
    }
    return (
        <div className={'border-b border-border pr-1'}>
            <div className={'px-3 border-r pb-1 border-border bg-inherit font-normal'}>
                <div className={className}>
                    <ErrorBoundary
                        fallback={(err) => (
                            <div className={cn('flex items-center justify-center text-muted-foreground h-full')}>
                                Could not load column stats: {err.message}
                            </div>
                        )}
                    >
                        <ColumnsStatsViewContent stats={stats} relationState={relationState}
                                                 className={'h-full w-full'}/>
                    </ErrorBoundary>
                </div>
            </div>
        </div>
    );


}

function ColumnsStatsViewContent({stats, className}: ColumnStatsProps) {
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
                <ColumnStatsViewHist
                    dataType={stats.histogramType}
                    className={className}
                    histogramData={stats.values}
                    totalCount={stats.nonNullCount}
                />
            );
        case 'top-n':
            return (
                <ColumnStatsViewTopN
                    className={className}
                    topValues={stats.topValues}
                    othersCount={stats.othersCount}
                    nonNullCount={stats.nonNullCount}
                />
            );
        case 'minMax':
            return (
                <ColumnStatsViewMinMax
                    className={className}
                    min={stats.min}
                    max={stats.max}
                    nonNullCount={stats.nonNullCount}
                />
            );
        case 'non_null':
            return (
                <ColumnStatsViewNull
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
