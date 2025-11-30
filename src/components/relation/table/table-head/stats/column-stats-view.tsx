import React from 'react';
import {ColumnStats, GetStatForColumn, RelationState, RelationStats} from '@/model/relation-state';
import {ColumnStatsViewHist} from './column-stats-view-hist';
import {ColumnStatsViewTopN} from './column-stats-view-top-n';
import {ColumnStatsViewMinMax} from './column-stats-view-min-max';
import {ColumnStatsViewNull} from './column-stats-view-null';
import {ErrorBoundary} from "@/components/basics/error-bundary";
import {cn} from "@/lib/utils";

export interface ColumnStatsProps {
    relationStats?: RelationStats;
    className?: string;
    relationState: RelationState
    columnIndex: number;
    onSelectedChange: (selected: string[]) => void;
}

export function ColumnStatsView({relationStats, className, relationState, columnIndex, onSelectedChange}: ColumnStatsProps) {

    const showStats = relationState.viewState.tableState.showStats;
    if (!showStats) {
        return <></>
    }

    if (!relationStats) {
        return <>
            No stats
        </>
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
                        <ColumnsStatsViewContent
                            relationStats={relationStats}
                            columnIndex={columnIndex}
                            className={'h-full w-full'}
                            onSelectedChange={onSelectedChange}
                        />
                    </ErrorBoundary>
                </div>
            </div>
        </div>
    );


}

interface ColumnsStatsViewContentProps {
    relationStats: RelationStats,
    columnIndex: number,
    className: string,
    onSelectedChange: (selected: string[]) => void,
}

function ColumnsStatsViewContent({relationStats, columnIndex, className, onSelectedChange}: ColumnsStatsViewContentProps) {

    if (relationStats.state === 'loading') {
        return <div className={cn("w-full text-muted-foreground flex items-center justify-center", className)}>
            Loading ...
        </div>
    }

    if (relationStats.state === 'empty') {
        return <div className={cn("w-full text-muted-foreground  flex items-center justify-center text-center", className)}>
            No stats available. <br/>
            Run query again
        </div>
    }


    const columnStats = GetStatForColumn(columnIndex, relationStats)
    if (!columnStats) {
        return <div className={cn("w-full h-6 flex items-center justify-center")}>
            Error!
        </div>
    }


    if (!columnStats) {
        return (
            <div className={cn(className, 'flex items-center justify-center text-muted-foreground')}>
                No Stats Available
            </div>
        );
    }

    switch (columnStats.type) {
        case 'histogram':
            return (
                <ColumnStatsViewHist
                    dataType={columnStats.histogramType}
                    className={className}
                    histogramData={columnStats.values}
                    totalCount={columnStats.nonNullCount}
                />
            );
        case 'top-n':
            return (
                <ColumnStatsViewTopN
                    className={className}
                    topValues={columnStats.topValues}
                    othersCount={columnStats.othersCount}
                    nonNullCount={columnStats.nonNullCount}
                    onSelectedChange={onSelectedChange}
                    selected={[]}
                />
            );
        case 'minMax':
            return (
                <ColumnStatsViewMinMax
                    className={className}
                    min={columnStats.min}
                    max={columnStats.max}
                    nonNullCount={columnStats.nonNullCount}
                />
            );
        case 'non_null':
            return (
                <ColumnStatsViewNull
                    className={className}
                    nonNullCount={columnStats.nonNullCount}
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
