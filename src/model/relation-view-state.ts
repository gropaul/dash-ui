import {
    getInitialTableDisplayState,
    getInitialTableDisplayStateEmpty,
    TableViewState
} from "@/model/relation-view-state/table";
import {RelationData} from "@/model/relation";
import {deepEqual} from "@/platform/object-utils";
import {Column} from "@/model/data-source-connection";
import {
    getInitialTextViewState,
    getInitialTextViewStateEmpty,
    TextDisplayViewState
} from "@/model/relation-view-state/text-display";
import {
    getInitialParametersState,
    ParametersState
} from "@/model/relation-view-state/parameters";

export type Layout = 'row' | 'column';

export interface WidgetConfigShellState {
    showConfig: boolean;
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
            },
        };
    }
    // embedded
    return {
        codeFenceState,
        configState: {
            showConfig: false,
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
    // One state per widget type
    tableState: TableViewState
    textDisplayState: TextDisplayViewState

    // Other view related things
    parametersState: ParametersState
    schema: Column[];
    /** Session state for embedded mode (canvas node). Optional for backwards compat. */
    embeddedSessionState?: RelationSessionState;
    /** Session state for fullscreen mode (editor tab, canvas fullscreen). Optional for backwards compat. */
    fullscreenSessionState?: RelationSessionState;
}

export type RelationViewType = 'table' | 'chart' | 'map' | 'select' | 'text' | 'slider';
export type RelationViewHeight = 'fit' | 'full'; // fit: take the height of the content, full: take all available height


const RELATION_SIZE_REQUIREMENTS: Record<RelationViewHeight, RelationViewType[]> = {
    'fit': ['select', "slider"],
    'full': ['table', 'chart', 'map', 'text'],
}

// only used for HeightType = fit as for resizable the height of the element is static anyway
export function getViewSizeRequirements(viewType: RelationViewType): RelationViewHeight {
    for (const [size, viewTypes] of Object.entries(RELATION_SIZE_REQUIREMENTS)) {
        if (viewTypes.includes(viewType as RelationViewType)) {
            return size as RelationViewHeight;
        }
    }
    throw new Error(`No size requirements found for view type: ${viewType}`);
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

export function getInitViewState(displayName: string, data?: RelationData, schemaColumns?: Column[], showCode = true): RelationViewState {

    const baseState: RelationViewBaseState = {
        ...getInitialTabViewBaseState(displayName),
        selectedView: 'table',
        showHeader: true,
    }

    if (!data) {
        return {
            ...baseState,
            tableState: getInitialTableDisplayStateEmpty(),
            textDisplayState: getInitialTextViewStateEmpty(),
            parametersState: getInitialParametersState(),
            schema: [],
            embeddedSessionState: getDefaultSessionState('embedded', showCode),
            fullscreenSessionState: getDefaultSessionState('fullscreen', showCode)
        };
    }

    return {
        ...baseState,
        tableState: getInitialTableDisplayState(data),
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
