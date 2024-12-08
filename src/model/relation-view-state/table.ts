import {RelationData} from "@/model/relation";

export interface ColumnViewState {
    width: number;
    wrapContent: boolean;
}


export interface TableViewState {
    // key is column name, value is display state -> map, can always be null!
    columnStates: { [key: string]: ColumnViewState };
    // order of the columns to be displayed. if a column is not in this list it will be displayed at the end
    columnsOrder: string[];
    // columns that are currently not displayed, if a column is not in this list it is displayed
    columnsHidden: string[];

}

export const INITIAL_COLUMN_VIEW_STATE: ColumnViewState = {
    width: 192,
    wrapContent: false,
}

export function getInitialTableDisplayStateEmpty(): TableViewState {
    return {
        columnsOrder: [],
        columnsHidden: [],
        columnStates: {},
    };
}

export function getTableColumnViewIndices(tableState: TableViewState, relationData: RelationData): number[] {

    const relationColumnNames = relationData.columns.map(column => column.name);

    const orderedAndNotHidden = tableState.columnsOrder.filter(column => !tableState.columnsHidden.includes(column));

    const indices: number[] = [];

    for (const column of orderedAndNotHidden) {
        const indexInRelation = relationColumnNames.indexOf(column);
        if (indexInRelation !== -1) {
            indices.push(indexInRelation);
        }
    }

    // get all columns that are not hidden and not in the order list
    const notOrderedAndHidden = relationColumnNames.filter(column =>
        !tableState.columnsOrder.includes(column)
        && !tableState.columnsHidden.includes(column));

    // add them to the end
    for (const column of notOrderedAndHidden) {
        indices.push(relationColumnNames.indexOf(column));
    }

    return indices;
}

export function getInitialTableDisplayState(relationData: RelationData): TableViewState {

    let columnStates: { [key: string]: ColumnViewState } = {};
    let columnOrder: string[] = [];
    relationData.columns.forEach(column => {
        columnOrder.push(column.name);
        columnStates[column.name] = {...INITIAL_COLUMN_VIEW_STATE};
    });

    return {
        columnsOrder: columnOrder,
        columnsHidden: [],
        columnStates: columnStates,
    };
}


