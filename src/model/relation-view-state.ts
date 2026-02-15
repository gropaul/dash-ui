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

//

export type Layout = 'row' | 'column';

export interface CodeFenceViewState {
    show: boolean;
    sizePercentage: number; // percentage, 0-100
    layout: Layout;
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
    codeFenceState: CodeFenceViewState;
    selectedView: RelationViewType;
    showHeader: boolean;
}

export interface RelationViewState extends RelationViewBaseState {
    tableState: TableViewState
    chartState: ChartViewState
    inputTextState: InputTextViewState
    schema: Column[];
}


export type RelationViewType = 'table' | 'chart' | 'map' | 'select';
export type RelationViewSizing = 'fit' | 'full'; // fit: take the height of the content, full: take all available height


const RELATION_SIZE_REQUIREMENTS: Record<RelationViewSizing, RelationViewType[]> = {
    'fit': ['select'],
    'full': ['table', 'chart', 'map'],
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
        codeFenceState: {
            show: showCode,
            sizePercentage: 30,
            layout: 'row',
        },
        selectedView: 'table',
        showHeader: true,
    }

    if (!data) {
        return {
            ...baseState,
            chartState: getInitialChartViewStateEmpty(),
            tableState: getInitialTableDisplayStateEmpty(),
            inputTextState: getInitialSelectViewStateEmpty(),
            schema: [],
        };
    }

    return {
        ...baseState,
        chartState: getInitialChartViewState(data),
        tableState: getInitialTableDisplayState(data),
        inputTextState: getInitialSelectViewState(data),
        schema: schemaColumns ?? data.columns,
    };
}
