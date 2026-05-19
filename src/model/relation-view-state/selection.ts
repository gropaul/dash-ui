export type SelectionMode = 'select' | 'slider';

export interface RelationSelectionState {
    mode: SelectionMode;
    select?: SelectSelectionState;
}

export interface SelectSelectionState {
    columnName: string;
}
