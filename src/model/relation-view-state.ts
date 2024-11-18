import {
    getInitialTableDisplayState,
    getInitialTableDisplayStateEmpty,
    TableViewState
} from "@/model/relation-view-state/table";
import {Relation} from "@/model/relation";

export interface RelationViewBaseState {
    showCode: boolean;
    selectedView: RelationViewType;
}

export interface RelationViewState extends RelationViewBaseState {
    tableState: TableViewState
}

export type RelationViewType = 'table' | 'chart';

export function getInitViewState(relation?: Relation): RelationViewState {


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
