import {useMemo} from "react";
import {create} from "zustand";
import {SlateEditor, TElement} from "platejs";
import {createPlatePlugin, PlateEditor, usePluginOption} from "platejs/react";
import {RelationQueryParameters, RelationState} from "@/model/relation-state";
import {getDefaultSessionState, getInitViewState, RelationViewType} from "@/model/relation-view-state";
import {AVAILABLE_PLOT_TYPES, AxisConfig, getInitialAxisDecoration, PlotType} from "@/model/relation-view-state/chart";
import {ViewManager} from "@/model/relation-state/relation-view";
import {ChartQueryParameters, getInitialChartQueryParameters} from "@/model/relation-state/relation-view-chart";
import {DATABASE_CONNECTION_ID_DUCKDB_LOCAL} from "@/platform/global-data";
import {deepEqual} from "@/platform/object-utils";
import {humanizeName} from "@/platform/string-utils";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";
import {useRelationsState} from "@/state/relations.state";
import {RELATION_BLOCK_KEY, TRelationBlock} from "@/components/page-editor/model";

// `view:` names one of these views, or else a plot type of the chart view.
const OTHER_VIEW_TYPES: RelationViewType[] = ['table', 'text', 'select', 'slider'];

/** Resolves a block's `-- input: <path>.sql` to the query of the project it takes in; set by the page's host. */
export const BlockInputPlugin = createPlatePlugin({
    key: 'blockInput',
    options: {resolve: ((_path: string) => undefined) as (path: string) => RelationState | undefined},
});

/** The query a block takes in, if it has an `input` and the query exists. */
export function inputOf(editor: SlateEditor, block: Pick<TRelationBlock, 'header'>): RelationState | undefined {
    const path = block.header.input;
    return path ? (editor as PlateEditor).getOption(BlockInputPlugin, 'resolve')(path) : undefined;
}

/**
 * Relation states of the inline blocks, keyed by a hash of SQL + settings. Rebuilding the document from the
 * markdown remounts every block; unchanged blocks find their state here and don't run again. Reference
 * blocks use the relation in the relations store instead.
 */
export const useBlockRelations = create<{
    relations: Record<string, RelationState>;
    setRelation: (relation: RelationState) => void;
    /** The block open in the fullscreen dialog: its relation and the block to write changes back to. */
    fullscreen: { relationId: string, blockId: string } | null;
    setFullscreen: (fullscreen: { relationId: string, blockId: string } | null) => void;
}>((set) => ({
    relations: {},
    setRelation: (relation) => set(state => ({relations: {...state.relations, [relation.id]: relation}})),
    fullscreen: null,
    setFullscreen: (fullscreen) => set({fullscreen}),
}));

/**
 * The relation behind a relation block and its actions, from the block itself or, for a reference, from the
 * relations store. Undefined for any other block (and for a reference to a missing relation), so it can be
 * called for every block.
 */
export function useBlockRelation(element: TElement) {
    const block = element.type === RELATION_BLOCK_KEY ? element as TRelationBlock : undefined;
    const referenceId = block?.relationId;
    // Subscribed, so a block follows the query it takes in.
    const resolve = usePluginOption(BlockInputPlugin, 'resolve');
    const input = block?.header.input ? resolve(block.header.input) : undefined;
    const inline = useMemo(
        // Nothing to show when the query taken in doesn't exist.
        () => block && !referenceId && (input || !block.header.input) ? buildBlockRelation(block, input) : undefined,
        [block, referenceId, input],
    );
    const stored = useBlockRelations(s => inline ? s.relations[inline.id] : undefined);
    const referenced = useRelationsState(s => referenceId ? s.relations[referenceId] : undefined);
    const setInline = useBlockRelations(s => s.setRelation);
    const setStored = useRelationsState(s => s.updateRelation);

    const relation = referenced ?? stored ?? inline;
    const updateRelation = referenceId ? setStored : setInline;
    const actions = useMemo(
        () => relation && getRelationActions({mode: 'embedded', relationState: relation, updateRelation}),
        [relation, updateRelation],
    );
    return relation && actions ? {relation, actions, updateRelation, isReference: !!referenceId} : undefined;
}

/**
 * The relations of the inline blocks currently in the document, including ones that haven't run yet; the
 * store also holds earlier versions of each.
 */
export function relationsInDocument(editor: SlateEditor): Record<string, RelationState> {
    const {relations} = useBlockRelations.getState();
    const current: Record<string, RelationState> = {};
    for (const [node] of editor.api.nodes<TRelationBlock>({at: [], match: {type: RELATION_BLOCK_KEY}})) {
        const input = inputOf(editor, node);
        if (node.relationId || node.header.input && !input) continue;
        const built = buildBlockRelation(node, input);
        current[built.id] = relations[built.id] ?? built;
    }
    return current;
}

/** The `view:` value for showing a block as `viewType`; a chart keeps its last plot type. */
export function headerForViewType(relation: RelationState, viewType: RelationViewType): string {
    if (viewType !== 'chart') return viewType;
    return relation.query.viewParameters.chart?.plot.type ?? 'bar';
}

function viewParametersOf(relation: RelationState) {
    const parameters = relation.query.viewParameters as unknown as Record<string, unknown>;
    // Through JSON, so keys set to undefined don't count as a difference.
    return JSON.parse(JSON.stringify(parameters[relation.viewState.selectedView] ?? null));
}

// The name is the default chart title and dropdown label; settings only hold them when they differ.
function withoutNameDefaults(settings: { plot?: { title?: string }, label?: string } | null, name: string) {
    if (settings?.plot?.title === humanizeName(name)) delete settings.plot.title;
    if (settings?.label === humanizeName(name)) delete settings.label;
    return settings;
}

/**
 * The fence header for an inline block's relation edited in the fullscreen view: the readable keys, plus
 * `settings` with the complete settings when they hold more than the readable keys give. Header keys it
 * doesn't cover are kept.
 */
export function headerFromRelation(relation: RelationState, previous: Record<string, string>, sql: string, input?: RelationState): Record<string, string> {
    const {view: previousView, x, y, ...rest} = previous;
    delete rest.settings;
    const header: Record<string, string | undefined> = {view: previousView, x, y};
    const plot = relation.query.viewParameters.chart?.plot;
    if (OTHER_VIEW_TYPES.includes(relation.viewState.selectedView)) {
        header.view = relation.viewState.selectedView;
    } else if (relation.viewState.selectedView === 'chart' && plot) {
        const pie = plot.type === 'pie';
        const ys = pie ? [plot.pie.axis.radius?.columnId] : (plot.cartesian.yAxes ?? []).map(a => a.columnId);
        header.view = plot.type;
        header.x = (pie ? plot.pie.axis.label?.columnId : plot.cartesian.xAxis?.columnId) ?? undefined;
        header.y = ys.filter(Boolean).join(', ') || undefined;
    }
    const readable = Object.fromEntries(Object.entries({...header, ...rest}).filter(([, v]) => v !== undefined)) as Record<string, string>;

    const name = relation.viewState.displayName;
    const settings = withoutNameDefaults(viewParametersOf(relation), name);
    const fromReadable = withoutNameDefaults(viewParametersOf(buildBlockRelation({sql, header: readable, name}, input)), name);
    return deepEqual(settings, fromReadable) ? readable : {...readable, settings: JSON.stringify(settings)};
}

function hashString(value: string) {
    let hash = 5381;
    for (let i = 0; i < value.length; i++) hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
    return (hash >>> 0).toString(36);
}

/** An axis on `columnId`, keeping the decoration of the axis that already showed it. */
function axis(columnId: string, index: number, previous: (AxisConfig | undefined)[] = []): AxisConfig {
    const decoration = previous.find(a => a?.columnId === columnId)?.decoration ?? getInitialAxisDecoration(index);
    return {columnId, decoration};
}

/** The readable header keys applied to a chart's settings; `chart` is the settings from `settings`, if any. */
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

function parseSettings(json: string | undefined) {
    if (!json) return undefined;
    try {
        return JSON.parse(json);
    } catch {
        return undefined;
    }
}

/**
 * Builds an inline block's state the way `RelationActions.create` does, but without its CREATE event. Other
 * blocks read it through `refs.<title>()`, expanded when they run (page-refs.ts). The id doubles as the cache
 * table name, so the same block reuses its cached result.
 *
 * A block with an `input` takes the query's SQL and view, and its own header keys override the view.
 */
export function buildBlockRelation({sql: ownSql, header, name = ''}: Pick<TRelationBlock, 'sql' | 'header' | 'name'>, input?: RelationState): RelationState {
    const sql = input ? input.query.baseQuery : ownSql;
    const inputKey = input ? input.viewState.selectedView + JSON.stringify(input.query.viewParameters) : '';
    const id = `block-${hashString(name + '\n' + sql + JSON.stringify(header) + inputKey)}`;
    const title = humanizeName(name);
    const otherView = OTHER_VIEW_TYPES.find(type => type === header.view);
    const settings = parseSettings(header.settings);

    const viewState = getInitViewState(name, undefined, [], false);
    viewState.fullscreenSessionState = getDefaultSessionState('fullscreen', true);
    viewState.selectedView = otherView ?? (header.view || !input ? 'chart' : input.viewState.selectedView);

    const viewParameters = input ? structuredClone(input.query.viewParameters) : ViewManager.instance.getInitialQueryParameters();
    viewParameters.type = viewState.selectedView;
    if (settings) (viewParameters as unknown as Record<string, unknown>)[viewState.selectedView] = settings;
    if (viewState.selectedView === 'select') {
        // A dropdown of `column`'s values; refs.<title>() returns the rows with the picked value.
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
        query: {activeBaseQuery: sql, baseQuery: sql, viewParameters: viewParameters as RelationQueryParameters},
        viewState,
        executionState: {state: 'not-started'},
    };
}
