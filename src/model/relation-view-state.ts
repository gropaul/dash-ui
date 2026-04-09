import {
    getInitialTableDisplayState,
    getInitialTableDisplayStateEmpty,
    TableViewState
} from "@/model/relation-view-state/table";
import {RelationData} from "@/model/relation";
import {deepEqual} from "@/platform/object-utils";
import {
    ChartViewState,
    getInitialChartViewState,
    getInitialChartViewStateEmpty
} from "@/model/relation-view-state/chart";
import {Column} from "@/model/data-source-connection";
import {
    getInitialSelectViewState,
    getInitialSelectViewStateEmpty,
    InputTextViewState
} from "@/model/relation-view-state/select";
import {
    getInitialTextViewState,
    getInitialTextViewStateEmpty,
    TextDisplayViewState
} from "@/model/relation-view-state/text-display";
import {
    getInitialParametersState,
    ParametersState
} from "@/model/relation-view-state/parameters";
import {SelectionState} from "@/model/relation-view-state/selection";

//

export type Layout = 'row' | 'column';

export interface WidgetConfigShellState {
    showConfig: boolean;
    configSplitRatio: number;
    configSplitLayout: Layout;
}

export interface CodeFenceViewState {
    show: boolean;
    sizePercentage: number; // percentage, 0-100
    layout: Layout;
}

/** UI-only state that is scoped per rendering mode (embedded vs fullscreen). */
export interface RelationSessionState {
    codeFenceState: CodeFenceViewState;
    configState: WidgetConfigShellState;
}

/**
 * The two modes in which a relation view can be rendered.
 * - 'embedded': inside a canvas node (small, minimal UI)
 * - 'fullscreen': editor tab, canvas fullscreen, or chat view (full UI)
 */
export type RelationViewMode = 'embedded' | 'fullscreen';

export function getDefaultSessionState(mode: RelationViewMode, show_code: boolean = false): RelationSessionState {
    const codeFenceState: CodeFenceViewState = {show: show_code, sizePercentage: 30, layout: 'row'};
    if (mode === 'fullscreen') {
        return {
            codeFenceState,
            configState: {
                showConfig: true,
                configSplitRatio: 0.5,
                configSplitLayout: 'column'
            },
        };
    }
    // embedded
    return {
        codeFenceState,
        configState: {
            showConfig: false,
            configSplitRatio: 0.5,
            configSplitLayout: 'column'
        },
    };
}


export interface TabViewBaseState {
    displayName: string;
}

export function getInitialTabViewBaseState(displayName: string): TabViewBaseState {
    return {
        displayName: displayName,
    };
}

export interface RelationViewBaseState extends TabViewBaseState {
    selectedView: RelationViewType;
    showHeader: boolean;
}

export interface RelationViewState extends RelationViewBaseState {
    tableState: TableViewState
    chartState: ChartViewState
    inputTextState: InputTextViewState
    textDisplayState: TextDisplayViewState
    parametersState: ParametersState
    selectionState?: SelectionState
    schema: Column[];
    /** Session state for embedded mode (canvas node). Optional for backwards compat. */
    embeddedSessionState?: RelationSessionState;
    /** Session state for fullscreen mode (editor tab, canvas fullscreen). Optional for backwards compat. */
    fullscreenSessionState?: RelationSessionState;
}


export type RelationViewType = 'table' | 'chart' | 'map' | 'select' | 'text';
export type RelationViewSizing = 'fit' | 'full'; // fit: take the height of the content, full: take all available height


const RELATION_SIZE_REQUIREMENTS: Record<RelationViewSizing, RelationViewType[]> = {
    'fit': ['select'],
    'full': ['table', 'chart', 'map', 'text'],
}

// only used for HeightType = fit as for resizable the height of the element is static anyway
export function getViewSizeRequirements(viewType: RelationViewType): RelationViewSizing {
    for (const [size, viewTypes] of Object.entries(RELATION_SIZE_REQUIREMENTS)) {
        if (viewTypes.includes(viewType as RelationViewType)) {
            return size as RelationViewSizing;
        }
    }
    // default to full if not found
    return 'full';
}


export function updateRelationViewState(currentState: RelationViewState, newData: RelationData): RelationViewState {
    // if the current state is the initial state, return a new state with the new data
    const defaultState = getInitViewState(currentState.displayName, undefined);

    if (deepEqual(currentState, defaultState)) {
        return getInitViewState(currentState.displayName, newData);
    } else {
        return currentState;
    }
}

export function getInitViewState(displayName: string, data?: RelationData, schemaColumns?: Column[], showCode = false): RelationViewState {

    const baseState: RelationViewBaseState = {
        ...getInitialTabViewBaseState(displayName),
        selectedView: 'table',
        showHeader: true,
    }

    if (!data) {
        return {
            ...baseState,
            chartState: getInitialChartViewStateEmpty(),
            tableState: getInitialTableDisplayStateEmpty(),
            inputTextState: getInitialSelectViewStateEmpty(),
            textDisplayState: getInitialTextViewStateEmpty(),
            parametersState: getInitialParametersState(),
            schema: [],
            embeddedSessionState: getDefaultSessionState('embedded', showCode),
            fullscreenSessionState: getDefaultSessionState('fullscreen', showCode)
        };
    }

    return {
        ...baseState,
        chartState: getInitialChartViewState(data),
        tableState: getInitialTableDisplayState(data),
        inputTextState: getInitialSelectViewState(data),
        textDisplayState: getInitialTextViewState(data),
        parametersState: getInitialParametersState(),
        schema: schemaColumns ?? data.columns,
        embeddedSessionState: getDefaultSessionState('embedded'),
        fullscreenSessionState: {
            ...getDefaultSessionState('fullscreen'),
            codeFenceState: {show: showCode, sizePercentage: 30, layout: 'row'},
        },
    };
}
