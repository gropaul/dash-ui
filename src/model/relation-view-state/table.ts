import {RelationData} from "@/model/relation";
import {ColumnDecoration} from "@/model/relation-view-state/decoration";
import z from "zod";

/**
 * LLM-controllable subset of the table view configuration.
 * TableViewState extends this with UI-level details (column widths, etc).
 */
export interface TableViewConfig {
    columnsOrder: string[];
    columnsHidden: string[];
    showStats?: boolean;
    showIndexColumn?: boolean;
}

/** Zod schema matching TableViewConfig — used as tool input schema. */
export const TableViewConfigSchema = z.object({
    columnsOrder: z.array(z.string()).describe('Order of columns to display. Columns not listed appear at the end.'),
    columnsHidden: z.array(z.string()).describe('Columns to hide from the table.'),
    showStats: z.boolean().optional().describe('Whether to show column statistics.'),
    showIndexColumn: z.boolean().optional().describe('Whether to show the row index column. Defaults to true.'),
});

export interface ColumnViewState {
    width: number;
    wrapContent: boolean;
    // optional for backwards compatibility with persisted states
    decoration?: ColumnDecoration;
}


export interface TableViewState extends TableViewConfig {
    // key is column name, value is display state -> map, can always be null!
    columnStates: { [key: string]: ColumnViewState };
}

/**
 * Creates a full TableViewState from LLM-provided config, filling in
 * default column display states for any columns in the order list.
 */
export function tableViewStateFromConfig(config: TableViewConfig): TableViewState {
    const columnStates: { [key: string]: ColumnViewState } = {};
    for (const col of config.columnsOrder) {
        columnStates[col] = {...INITIAL_COLUMN_VIEW_STATE};
    }
    return {
        ...config,
        columnStates,
    };
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
        showStats: false,
        showIndexColumn: true,
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

    // if there are no indices, but there would be relationColumnNames, return the first
    if (indices.length == 0 && relationColumnNames.length != 0 ){
        return [0];
    } else {
        return indices;
    }

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
        showIndexColumn: true,
    };
}


