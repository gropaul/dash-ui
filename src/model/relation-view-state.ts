import {
    getInitialTableDisplayState,
    getInitialTableDisplayStateEmpty,
    TableViewState
} from "@/model/relation-view-state/table";
import {Relation, RelationData} from "@/model/relation";
import {deepEqual} from "@/platform/utils";

export interface RelationViewBaseState {
    showCode: boolean;
    selectedView: RelationViewType;
}

export interface RelationViewState extends RelationViewBaseState {
    tableState: TableViewState
}

export type RelationViewType = 'table' | 'chart';


export function updateRelationViewState(currentState: RelationViewState, newData: RelationData): RelationViewState {
    // if the current state is the initial state, return a new state with the new data
    const defaultState = getInitViewState(undefined);

    console.log(currentState);
    console.log(defaultState);
    if (deepEqual(currentState, defaultState)) {
        console.log('here');
        return getInitViewState(newData);
    } else {
        return currentState;
    }
}

export function getInitViewState(relation?: RelationData): RelationViewState {

    const baseState: RelationViewBaseState = {
        showCode: false,
        selectedView: 'table',
    }

    if (!relation) {
        return {
            ...baseState,
            tableState: getInitialTableDisplayStateEmpty(),
        };
    }

    return {
        ...baseState,
        tableState: getInitialTableDisplayState(relation),
    };
}
