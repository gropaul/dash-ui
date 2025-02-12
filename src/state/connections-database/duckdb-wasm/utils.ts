// import {ConnectionsService} from "@/state/connections/connections-service";
// import {DuckDBWasm} from "@/state/connections/database/duckdb-wasm";
// import {RelationSource} from "@/model/relation";
// import {DEFAULT_RELATION_VIEW_PATH, DUCKDB_BASE_SCHEMA, DUCKDB_IN_MEMORY_DB} from "@/platform/global-data";
// import {useRelationsState} from "@/state/relations.state";
// import {useConnectionsState} from "@/state/connections.state";
//
// export async function importAndShowRelationsWithWASM(files: File[]) {
//     const duckDBWasm = ConnectionsService.getInstance().getDuckDBWasmConnection();
//     if (!duckDBWasm) {
//         console.error('DuckDB WASM connection not found');
//         throw new Error('DuckDB WASM connection not found');
//     }
//     const tableNames = await importFilesToDuckDBWasm(duckDBWasm, files);
//
//     const showRelation = useRelationsState.getState().showRelationFromSource;
//     const updateDataSources = useConnectionsState.getState().loadAllDataSources;
//
//     for (const tableName of tableNames) {
//         const source: RelationSource = {
//             type: 'table',
//             database: DUCKDB_IN_MEMORY_DB,
//             schema: DUCKDB_BASE_SCHEMA,
//             tableName: tableName,
//         }
//         await showRelation(duckDBWasm.id, source, DEFAULT_RELATION_VIEW_PATH);
//     }
//     await updateDataSources(duckDBWasm.id);
// }
//
// export async function importFilesToDuckDBWasm(duckDBWasm: DuckDBWasm, files: File[]): Promise<string[]> {
//     // get the first file
//     // read the file
//     const relation_names = [];
//     for (const file of files) {
//         const relation_name = await duckDBWasm.createTableFromBrowserFileHandler(file);
//         relation_names.push(relation_name);
//     }
//     return relation_names;
// }