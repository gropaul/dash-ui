import {
    getInitialTableDisplayState,
    getInitialTableDisplayStateEmpty,
    TableViewState
} from "@/model/relation-view-state/table";
import {RelationData} from "@/model/relation";
import {deepEqual} from "@/platform/utils";
import {
    ChartViewState,
    getInitialChartViewState,
    getInitialChartViewStateEmpty
} from "@/model/relation-view-state/chart";

//

export type Layout = 'row' | 'column';

export interface CodeFenceViewState {
    show: boolean;
    sizePercentage: number; // percentage, 0-1
    layout: Layout;
}

export interface RelationViewBaseState {
    codeFenceState: CodeFenceViewState;
    displayName: string;
    selectedView: RelationViewType;
}

export interface RelationViewState extends RelationViewBaseState {
    tableState: TableViewState
    chartState: ChartViewState
}

export type RelationViewType = 'table' | 'chart' | 'map';


export function updateRelationViewState(currentState: RelationViewState, newData: RelationData): RelationViewState {
    // if the current state is the initial state, return a new state with the new data
    const defaultState = getInitViewState(currentState.displayName, undefined);

    if (deepEqual(currentState, defaultState)) {
        return getInitViewState(currentState.displayName, newData);
    } else {
        return currentState;
    }
}

export function getInitViewState(displayName: string, data?: RelationData, showCode = false): RelationViewState {

    const baseState: RelationViewBaseState = {
        displayName: displayName,
        codeFenceState: {
            show: showCode,
            sizePercentage: 0.3,
            layout: 'column',
        },
        selectedView: 'table',
    }

    if (!data) {
        return {
            ...baseState,
            chartState: getInitialChartViewStateEmpty(),
            tableState: getInitialTableDisplayStateEmpty(),
        };
    }

    return {
        ...baseState,
        chartState: getInitialChartViewState(data),
        tableState: getInitialTableDisplayState(data),
    };
}
