import {RelationQueryParameters, RelationState} from "@/model/relation-state";
import {getDefaultSessionState, getInitViewState, RelationViewType} from "@/model/relation-view-state";
import {AVAILABLE_PLOT_TYPES, AxisConfig, getInitialAxisDecoration, PlotType} from "@/model/relation-view-state/chart";
import {getInitialTableDisplayState, getInitialTableDisplayStateEmpty} from "@/model/relation-view-state/table";
import {ViewManager} from "@/model/relation-state/relation-view";
import {ChartQueryParameters, getInitialChartQueryParameters} from "@/model/relation-state/relation-view-chart";
import {DATABASE_CONNECTION_ID_DUCKDB_LOCAL} from "@/platform/global-data";
import {deepEqual} from "@/platform/object-utils";
import {humanizeName} from "@/platform/string-utils";

/**
 * The config of a query or a page block, as its file holds it: `-- key: value` header lines over the SQL. The
 * readable keys (`view`, `x`, `y`, `column`) say the common things; `settings` holds, as JSON, whatever else
 * the views are set up with, as far as it differs from what the readable keys give. See dev/workspace-files.md.
 */
export interface RelationConfig {
    /** The surface key: a query's path, or `page.md#name` for a block. */
    id: string;
    /** What `refs.<name>()` calls it by, and its title. */
    name: string;
    sql: string;
    header: Record<string, string>;
}

const HEADER_LINE = /^--\s*([\w-]+):\s*(.*)$/;

/** The leading `-- key: value` lines of a query or fence, and the SQL below them, as written. */
export function splitHeader(text: string): { header: Record<string, string>, sql: string } {
    const lines = text.split('\n');
    const header: Record<string, string> = {};
    let i = 0;
    for (; i < lines.length; i++) {
        const match = HEADER_LINE.exec(lines[i].trim());
        if (!match) break;
        header[match[1]] = match[2].trim();
    }
    return {header, sql: lines.slice(i).join('\n')};
}

export function joinHeader(header: Record<string, string>, sql: string): string {
    const lines = Object.entries(header).map(([key, value]) => `-- ${key}: ${value}`);
    return [...lines, sql].filter(Boolean).join('\n');
}

// `view:` names one of these views, or else a plot type of the chart view.
const OTHER_VIEW_TYPES: RelationViewType[] = ['table', 'text', 'select', 'slider'];

/** The view a query file shows: its `view:` header, a chart for a plot type, a table without one. */
export function viewOfQuery(text: string): RelationViewType {
    const view = splitHeader(text).header.view;
    return OTHER_VIEW_TYPES.find(type => type === view) ?? (view ? 'chart' : 'table');
}

// --- settings: the views' setup beyond the readable keys -------------------------------------------------

/** What `settings` covers: every view's parameters (without the table's paging) and the display state. */
function setupOf(relation: RelationState): Record<string, unknown> {
    const {table, chart, select, text, slider} = relation.query.viewParameters;
    const {offset: _offset, ...tableSetup} = table;
    const {tableState, textDisplayState, showHeader} = relation.viewState;
    // Through JSON, so keys set to undefined don't count as a difference.
    return JSON.parse(JSON.stringify({table: tableSetup, chart, select, text, slider, tableState, textDisplayState, showHeader}));
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** The parts of `value` that differ from `base`; objects compared key by key, anything else as a whole. */
function diffSetup(value: unknown, base: unknown): unknown {
    if (deepEqual(value, base)) return undefined;
    if (!isObject(value) || !isObject(base)) return value;
    const result: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
        const d = diffSetup(v, base[key]);
        if (d !== undefined) result[key] = d;
    }
    return Object.keys(result).length ? result : undefined;
}

function mergeSetup<T>(base: T, patch: unknown): T {
    if (!isObject(patch) || !isObject(base)) return (patch === undefined ? base : patch) as T;
    const result: Record<string, unknown> = {...base};
    for (const [key, v] of Object.entries(patch)) result[key] = mergeSetup(result[key], v);
    return result as T;
}

function parseSettings(json: string | undefined): Record<string, unknown> | undefined {
    if (!json) return undefined;
    try {
        return JSON.parse(json);
    } catch {
        return undefined;
    }
}

// --- reading -------------------------------------------------------------------------------------------

/** An axis on `columnId`, keeping the decoration of the axis that already showed it. */
function axis(columnId: string, index: number, previous: (AxisConfig | undefined)[] = []): AxisConfig {
    const decoration = previous.find(a => a?.columnId === columnId)?.decoration ?? getInitialAxisDecoration(index);
    return {columnId, decoration};
}

/** The readable header keys applied to a chart's settings. */
function applyChartKeys(chart: ChartQueryParameters, header: Record<string, string>) {
    const type = header.view as PlotType | undefined;
    // Without a `view`, a chart taken in keeps its plot type.
    if (type || !chart.plot.type) chart.plot.type = type && AVAILABLE_PLOT_TYPES.includes(type) ? type : 'bar';
    const ys = (header.y ?? '').split(',').map(y => y.trim()).filter(Boolean);
    if (chart.plot.type === 'pie') {
        const previous = [chart.plot.pie.axis.label, chart.plot.pie.axis.radius];
        if (header.x) chart.plot.pie.axis.label = axis(header.x, 0, previous);
        if (ys[0]) chart.plot.pie.axis.radius = axis(ys[0], 1, previous);
    } else {
        const previous = [chart.plot.cartesian.xAxis, ...(chart.plot.cartesian.yAxes ?? [])];
        if (header.x) chart.plot.cartesian.xAxis = axis(header.x, 0, previous);
        if (ys.length) chart.plot.cartesian.yAxes = ys.map((y, i) => axis(y, i + 1, previous));
    }
}

/**
 * The relation a config shows, before it ran. A block with an `input` takes the query's SQL and setup, and its
 * own keys override them. Without a `view` a query is a table.
 */
export function buildRelation({id, name, sql: ownSql, header}: RelationConfig, input?: RelationState): RelationState {
    const sql = input ? input.query.baseQuery : ownSql;
    const title = humanizeName(name);
    const otherView = OTHER_VIEW_TYPES.find(type => type === header.view);
    const settings = parseSettings(header.settings) ?? {};

    let viewState = getInitViewState(name, undefined, [], false);
    viewState.fullscreenSessionState = getDefaultSessionState('fullscreen', true);
    viewState.selectedView = otherView ?? (header.view ? 'chart' : input ? input.viewState.selectedView : 'table');
    if (input) {
        const {tableState, textDisplayState, showHeader} = input.viewState;
        viewState = {...viewState, tableState: structuredClone(tableState), textDisplayState: structuredClone(textDisplayState), showHeader};
    }
    const {tableState, textDisplayState, showHeader, ...viewSettings} = settings;
    viewState = mergeSetup(viewState, {tableState, textDisplayState, showHeader});

    let viewParameters: RelationQueryParameters = input ? structuredClone(input.query.viewParameters) : ViewManager.instance.getInitialQueryParameters();
    viewParameters = mergeSetup(viewParameters, viewSettings);
    viewParameters.type = viewState.selectedView;

    if (viewState.selectedView === 'select') {
        // A dropdown of `column`'s values; refs.<name>() returns the rows with the picked value.
        viewParameters.select = {
            selectType: 'select',
            multiSelect: false,
            ...viewParameters.select,
            ...(header.column !== undefined && {column: header.column}),
        };
        viewParameters.select.label ||= title;
    }
    if (viewState.selectedView === 'chart') {
        const chart: ChartQueryParameters = viewParameters.chart ?? getInitialChartQueryParameters();
        applyChartKeys(chart, header);
        // Blocks show no relation header; the chart draws this title itself.
        chart.plot.title ||= title;
        viewParameters.chart = chart;
    }

    return {
        connectionId: DATABASE_CONNECTION_ID_DUCKDB_LOCAL,
        id,
        source: {type: 'query', baseQuery: sql, id, name: title},
        query: {activeBaseQuery: sql, baseQuery: sql, viewParameters},
        viewState,
        executionState: {state: 'not-started'},
    };
}

// --- writing -------------------------------------------------------------------------------------------

/** The readable keys for the relation's view; header keys it doesn't cover (`input`, ...) are kept. */
function readableHeader(relation: RelationState, previous: Record<string, string>, input?: RelationState): Record<string, string> {
    const {view: previousView, x, y, column, settings: _settings, ...rest} = previous;
    const header: Record<string, string | undefined> = {view: previousView, x, y, column};
    const selected = relation.viewState.selectedView;
    const plot = relation.query.viewParameters.chart?.plot;
    // A block taking a query in names its view only to differ from the query's.
    const takenIn = input && previousView === undefined && selected === input.viewState.selectedView
        && (selected !== 'chart' || plot?.type === input.query.viewParameters.chart?.plot.type);
    if (OTHER_VIEW_TYPES.includes(selected)) {
        if (!takenIn) header.view = selected;
        if (selected === 'select' && column !== undefined) header.column = relation.query.viewParameters.select?.column;
    } else if (selected === 'chart' && plot) {
        const pie = plot.type === 'pie';
        if (!takenIn) header.view = plot.type;
        if (x !== undefined || y !== undefined || !input) {
            const ys = pie ? [plot.pie.axis.radius?.columnId] : (plot.cartesian.yAxes ?? []).map(a => a.columnId);
            header.x = (pie ? plot.pie.axis.label?.columnId : plot.cartesian.xAxis?.columnId) ?? undefined;
            header.y = ys.filter(Boolean).join(', ') || undefined;
        }
    }
    return Object.fromEntries(Object.entries({...header, ...rest}).filter(([, v]) => v !== undefined && v !== '')) as Record<string, string>;
}

/**
 * The header for `relation`, edited from `config`: the readable keys, and `settings` with the setup the readable
 * keys don't give. Display state still as the data made it counts as no setup.
 */
export function headerOf(relation: RelationState, config: RelationConfig, input?: RelationState): Record<string, string> {
    const readable = readableHeader(relation, config.header, input);
    const base = setupOf(buildRelation({...config, header: readable}, input));
    const columns = {columns: relation.viewState.schema, rows: []};
    const setup = setupOf(relation);
    for (const fromData of [getInitialTableDisplayStateEmpty(), getInitialTableDisplayState(columns)]) {
        if (deepEqual(setup.tableState, JSON.parse(JSON.stringify(fromData)))) setup.tableState = base.tableState;
    }
    const settings = diffSetup(setup, base);
    return settings === undefined ? readable : {...readable, settings: JSON.stringify(settings)};
}

/**
 * `built` (from the file) with what only lives in memory taken over from `stored`: the run, picks, paging, the
 * last run SQL, the schema, session state, and display state the file has no say about.
 */
export function withRuntime(built: RelationState, stored: RelationState | undefined, config: RelationConfig): RelationState {
    if (!stored) return built;
    const settings = parseSettings(config.header.settings) ?? {};
    const merged: RelationState = {
        ...built,
        executionState: stored.executionState,
        ...(stored.lastExecutionMetaData && {lastExecutionMetaData: stored.lastExecutionMetaData}),
        ...(stored.queryState && {queryState: stored.queryState}),
        query: {
            ...built.query,
            activeBaseQuery: stored.query.activeBaseQuery,
            viewParameters: {...built.query.viewParameters, table: {...built.query.viewParameters.table, offset: stored.query.viewParameters.table.offset}},
        },
        viewState: {
            ...built.viewState,
            schema: stored.viewState.schema,
            parametersState: stored.viewState.parametersState,
            fullscreenSessionState: stored.viewState.fullscreenSessionState,
            embeddedSessionState: stored.viewState.embeddedSessionState,
            ...(settings.tableState === undefined && {tableState: stored.viewState.tableState}),
            ...(settings.textDisplayState === undefined && {textDisplayState: stored.viewState.textDisplayState}),
        },
    };
    return deepEqual(merged, stored) ? stored : merged;
}
