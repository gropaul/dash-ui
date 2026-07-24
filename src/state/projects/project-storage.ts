import {DEFAULT_PROJECT_ID} from "@/platform/global-data";

let _currentProjectId: string = DEFAULT_PROJECT_ID;

export function setCurrentProjectStorage(projectId: string): void {
    _currentProjectId = projectId;
}

export function getCurrentProjectStorageId(): string {
    return _currentProjectId;
}

/** OPFS file name for the project's data database (the default DuckDB catalog: user tables + macros). */
export function getMainDbFileName(): string {
    return `${_currentProjectId}_dash_data.duckdb`;
}

/** OPFS file name for the project's state database (cache tables + persisted relation state). */
export function getDashDbFileName(): string {
    return `${_currentProjectId}_dash_state.duckdb`;
}
