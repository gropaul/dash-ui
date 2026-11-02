"use client"

import React, {useEffect, useMemo, useRef, useState} from "react";
import {Braces, Calendar, Filter, Hash, Loader2, RefreshCw, Square, Text} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Muted} from "@/components/ui/typography";
import {ColumnConfigList, ColumnFilterTag} from "@/components/relation/common/column-config-list";
import {ValueIcon} from "@/components/relation/common/value-icon";
import {Column} from "@/model/data-source-connection";
import {duckDBTypeToValueType, getValueTypeGroup} from "@/model/value-type";
import {RelationConfigTabProps} from "@/components/relation/config/relation-config-tab";
import {ConnectionsService} from "@/state/connections/connections-service";
import {ViewManager} from "@/model/relation-state/relation-view";
import {ColumnStats} from "@/model/relation-state";
import {GetColumnStats} from "@/model/column-stats";
import {removeSemicolon} from "@/platform/sql-utils";
import {formatNumber} from "@/platform/number-utils";
import {ColumnFilter, setColumnFilter, StatsFilters} from "@/model/relation-state/stats-filters";
import {ColumnStatsViewHist} from "@/components/relation/table/table-head/stats/column-stats-view-hist";
import {ColumnStatsViewTopN} from "@/components/relation/table/table-head/stats/column-stats-view-top-n";

interface ColumnSummary {
    name: string;
    type: string;
    distinct: number;
    min: string | null;
    max: string | null;
    nullPercent: number;
    /** The histogram or top values the table's column header used to show (model/column-stats.ts). */
    stats?: ColumnStats;
}

/** The last summary; `sql` is the query's SQL as last run when it was taken: another run of other SQL makes it out of sync. */
interface Summary {
    columns: ColumnSummary[];
    sql: string;
}

/** What the tab is doing; the last summary stays shown through all of it. */
type Status = { state: 'loading' } | { state: 'stopped' } | { state: 'error', message: string } | { state: 'done' };

// The top values shown per text column; the rest count as others.
const TOP_VALUES = 5;
// How many columns start open; each opens and closes on its own.
const OPEN_COLUMNS = 5;

const FILTER_TAGS: ColumnFilterTag[] = [
    {key: 'numeric', label: 'Numeric', icon: <Hash size={12}/>, predicate: c => getValueTypeGroup(c.type) === 'numeric'},
    {key: 'date', label: 'Date', icon: <Calendar size={12}/>, predicate: c => getValueTypeGroup(c.type) === 'date'},
    {key: 'string', label: 'String', icon: <Text size={12}/>, predicate: c => getValueTypeGroup(c.type) === 'string'},
    {key: 'nested', label: 'Nested', icon: <Braces size={12}/>, predicate: c => getValueTypeGroup(c.type) === 'nested'},
];

/**
 * The columns of the query's result: DuckDB's SUMMARIZE of each (type, distinct values, range, nulls) and a chart of
 * its values, a histogram for numbers and dates, the top values for text. Both read the rows (the charts a sample of
 * them), so they are computed only when the tab shows, and again on Refresh; a run of the query leaves them as they are.
 * A bar picked or a range dragged in a chart filters the views on top of the query (stats-filters.ts), not the stats.
 */
export function SchemaTab({relationState, updateStatsFilters}: RelationConfigTabProps) {
    const [summary, setSummary] = useState<Summary>();
    const [status, setStatus] = useState<Status>({state: 'loading'});
    const [refreshed, setRefreshed] = useState(0);
    // Counts the clears of all filters: the charts are drawn again then, so they drop their picks too.
    const [cleared, setCleared] = useState(0);
    // Drops the results of the summary under way: on Stop, and when a newer one starts.
    const dropRun = useRef<() => void>(() => undefined);
    // The charts keep the handlers they were drawn with; through this they set a filter on the relation as it is now.
    const latest = useRef({filters: relationState.statsFilters, update: updateStatsFilters});
    latest.current = {filters: relationState.statsFilters, update: updateStatsFilters};
    const filterColumn = (name: string, filter: ColumnFilter | undefined) =>
        void latest.current.update(setColumnFilter(latest.current.filters, name, filter));
    // Set once the query has a result; the tab may show before its first run ends.
    const ran = relationState.lastExecutionMetaData?.lastExecutedAt !== undefined;

    useEffect(() => {
        if (!ran) return;
        let current = true;
        dropRun.current = () => {
            current = false;
        };
        const sql = relationState.query.activeBaseQuery;
        setStatus({state: 'loading'});
        const summarize = async () => {
            const {finalQuery} = await ViewManager.instance.buildQuery(relationState);
            const result = await ConnectionsService.getInstance().executeQuery(`SUMMARIZE (${removeSemicolon(finalQuery)});`, false);
            const at = (name: string) => result.columns.findIndex(c => c.name === name);
            const [name, type, min, max, distinct, nulls] = ['column_name', 'column_type', 'min', 'max', 'approx_unique', 'null_percentage'].map(at);
            const columns = result.rows.map(row => ({
                name: String(row[name]),
                type: String(row[type]),
                min: row[min] === null ? null : String(row[min]),
                max: row[max] === null ? null : String(row[max]),
                distinct: Number(row[distinct]),
                nullPercent: Number(row[nulls]),
            }));
            // The charts read the columns SUMMARIZE found, not the view's schema, which can be the previous run's.
            // They are extra: without them the tab still lists the columns.
            const typed: Column[] = columns.map(c => ({id: c.name, name: c.name, type: duckDBTypeToValueType(c.type)}));
            const stats = await GetColumnStats(relationState, {columns: typed, rows: []}).catch(e => {
                console.error('Column stats failed', e);
                return undefined;
            });
            return columns.map((column, i) => ({...column, stats: stats?.columns[i]}));
        };
        summarize()
            .then(columns => {
                if (!current) return;
                setSummary({columns, sql});
                setStatus({state: 'done'});
            })
            .catch(e => current && setStatus({state: 'error', message: e instanceof Error ? e.message : String(e)}));
        return () => {
            current = false;
        };
        // The relation as it is when the tab shows or Refresh is pressed; it changes with every pick and page.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [relationState.id, ran, refreshed]);

    if (!ran) return <Muted className="text-sm">Run the query to see its columns.</Muted>;

    function stop() {
        dropRun.current();
        setStatus({state: 'stopped'});
        // The abort reaches whatever the connection runs: while the view's own query runs, the stats are only dropped.
        if (relationState.executionState.state !== 'running') void ConnectionsService.getInstance().abortQuery();
    }

    const outOfDate = status.state !== 'loading' && summary !== undefined && summary.sql !== relationState.query.activeBaseQuery;
    const filters: StatsFilters = relationState.statsFilters ?? {};
    const filterCount = Object.keys(filters).length;
    const header = (
        <div className="flex items-center justify-end gap-2">
            {filterCount > 0 && (
                <Button variant="ghost" size="sm" className="mr-auto h-6 gap-1.5 px-2 text-xs text-primary"
                        onClick={() => {
                            setCleared(n => n + 1);
                            void updateStatsFilters({});
                        }}>
                    <Filter className="h-3 w-3"/>
                    {filterCount === 1 ? '1 filter' : `${filterCount} filters`} · Clear
                </Button>
            )}
            {status.state === 'loading' ? (
                <>
                    <span className="text-xs text-muted-foreground">Summarizing…</span>
                    {/* As the run button of the query: a stop square in a spinner. */}
                    <Button variant="ghost" size="icon" aria-label="Stop" className="relative h-6 w-6" onClick={stop}>
                        <Loader2 className="absolute h-6 w-6 animate-spin text-muted-foreground/40"/>
                        <Square className="relative h-2.5 w-2.5 text-destructive" fill="currentColor" fillOpacity={0.05}/>
                    </Button>
                </>
            ) : (
                <>
                    {outOfDate && <span className="text-xs text-muted-foreground">Out of sync</span>}
                    {status.state === 'stopped' && <span className="text-xs text-muted-foreground">Stopped</span>}
                    <Button variant={outOfDate ? "outline" : "ghost"} size="sm" className="h-6 gap-1.5 px-2 text-xs text-muted-foreground"
                            onClick={() => setRefreshed(n => n + 1)}>
                        <RefreshCw className="h-3 w-3"/>
                        Refresh
                    </Button>
                </>
            )}
        </div>
    );

    const error = status.state === 'error' && <Muted className="text-sm text-destructive">{status.message}</Muted>;
    if (!summary) {
        return (
            <div className="flex flex-col gap-1">
                {header}
                {error}
            </div>
        );
    }

    const byName = new Map(summary.columns.map(c => [c.name, c]));
    const columns: Column[] = summary.columns.map(c => ({id: c.name, name: c.name, type: duckDBTypeToValueType(c.type)}));

    return (
        <div className="flex flex-col gap-1">
            {header}
            {error}
            <ColumnConfigList
                // Other columns start over with the first ones open; a refresh of the same keeps what is open.
                key={columns.map(c => c.name).join('\n')}
                label="Columns"
                columns={columns}
                filterTags={[...FILTER_TAGS, {key: 'filtered', label: 'Filtered', icon: <Filter size={12}/>, predicate: c => c.name in filters}]}
                defaultOpen={columns.slice(0, OPEN_COLUMNS).map(c => c.name)}
                renderIcon={c => <span className="shrink-0 text-muted-foreground"><ValueIcon type={c.type} size={14}/></span>}
                renderStatus={c => (
                    <span className="flex shrink-0 items-center gap-1.5">
                        {c.name in filters && <Filter aria-label="Filtered" className="h-3 w-3 text-primary"/>}
                        <span className="font-mono text-[11px] text-muted-foreground">{byName.get(c.name)!.type}</span>
                    </span>
                )}
                renderExpanded={c => {
                    const column = byName.get(c.name)!;
                    return (
                        <>
                            {column.stats && <ColumnChart key={cleared} stats={column.stats} filter={filters[c.name]}
                                                          onFilter={filter => filterColumn(c.name, filter)}/>}
                            <div className="mt-1 truncate text-xs text-muted-foreground">{describe(column)}</div>
                        </>
                    );
                }}
            />
        </div>
    );
}

function ColumnChart({stats, filter, onFilter}: {
    stats: ColumnStats,
    filter?: ColumnFilter,
    onFilter: (filter: ColumnFilter | undefined) => void,
}) {
    // Once per result: new arrays would make the chart rebuild its options and click handler on every render.
    const topValues = useMemo(() => {
        if (stats.type !== 'top-n') return undefined;
        const shown = stats.topValues.slice(0, TOP_VALUES);
        const hidden = stats.topValues.slice(TOP_VALUES).reduce((sum, item) => sum + item.count, 0);
        return {shown, others: (stats.othersCount ?? 0) + hidden};
    }, [stats]);
    const picked = useMemo(() => filter?.type === 'values' ? filter.values : [], [filter]);

    if (stats.type === 'histogram') {
        return <ColumnStatsViewHist className="mt-1 h-36 w-full" histogramData={stats.values}
                                    totalCount={stats.nonNullCount} dataType={stats.histogramType}
                                    initialRange={filter?.type === 'range' ? filter : undefined}
                                    onRangeChangeEnd={(min, max) => onFilter(min === null || max === null ? undefined : {type: 'range', min, max})}/>;
    }
    if (stats.type === 'top-n' && topValues) {
        return <ColumnStatsViewTopN className="mt-1 w-full" topValues={topValues.shown} othersCount={topValues.others}
                                    nonNullCount={stats.nonNullCount} selected={picked}
                                    onSelectedChange={values => onFilter(values.length > 0 ? {type: 'values', values} : undefined)}/>;
    }
    return null;
}

function describe(column: ColumnSummary): string {
    // SUMMARIZE's approx_unique estimates the count (HyperLogLog).
    const parts = [`~${formatNumber(column.distinct)} distinct`];
    if (column.min !== null && column.max !== null && column.min !== column.max) parts.push(`${column.min} to ${column.max}`);
    if (column.nullPercent > 0) parts.push(`${column.nullPercent.toFixed(column.nullPercent < 1 ? 1 : 0)}% null`);
    return parts.join(' · ');
}
