import {getInitialTableDisplayState, TableViewState} from "@/model/relation-view-state/table";
import {Relation} from "@/model/relation";

export interface RelationViewBaseState {
    showCode: boolean;
    selectedView: RelationViewType;
}

export interface RelationViewState extends RelationViewBaseState {
    tableState: TableViewState
}


type RelationViewType = 'table' | 'chart';

export function getInitViewState(relation?: Relation): RelationViewState {


    const baseState: RelationViewBaseState = {
        showCode: false,
        selectedView: 'table',
    }

    if (!relation) {
        return {
            ...baseState,
            tableState: {
                columnStates: {},
            },
        };
    }

    return {
        ...baseState,
        tableState: getInitialTableDisplayState(relation),
    };
}
