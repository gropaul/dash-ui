

export interface RelationSelectionState {
    select?: SelectSelectionSate;
}

export interface SelectSelectionSate {
    columnName: string;        // the column to filter on
    selectedValues: any[];     // raw values the user picked (preserves JS types from DuckDB)
}
