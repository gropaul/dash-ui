import {
    getInitialTableDisplayState,
    getInitialTableDisplayStateEmpty,
    TableViewState
} from "@/model/relation-view-state/table";
import {RelationData} from "@/model/relation";
import {deepEqual} from "@/platform/utils";

export interface RelationViewBaseState {
    showCode: boolean;
    displayName: string;
    selectedView: RelationViewType;
}

export interface RelationViewState extends RelationViewBaseState {
    tableState: TableViewState
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
        showCode: showCode,
        selectedView: 'table',
    }

    if (!data) {
        return {
            ...baseState,
            tableState: getInitialTableDisplayStateEmpty(),
        };
    }

    return {
        ...baseState,
        tableState: getInitialTableDisplayState(data),
    };
}
