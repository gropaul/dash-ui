import {Relation} from "@/model/relation";

export interface ColumnViewState {
    width: number;
    wrapContent: boolean;
}


export interface TableViewState {
    // key is column name, value is display state -> map
    columnStates: { [key: string]: ColumnViewState };
}

export const INITIAL_COLUMN_VIEW_STATE: ColumnViewState = {
    width: 192,
    wrapContent: false,
}


export function getInitialTableDisplayState(relation: Relation): TableViewState {

    let columnStates: { [key: string]: ColumnViewState } = {};
    relation.columns.forEach(column => {
        columnStates[column.name] = {...INITIAL_COLUMN_VIEW_STATE};
    });

    return {
        columnStates: columnStates,
    };
}


