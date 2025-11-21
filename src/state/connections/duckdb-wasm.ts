import {RelationData} from "@/model/relation";
import {DataSource} from "@/model/data-source-connection";
import {
    ConnectionStatus,
    DatabaseConnection,
    DefaultStateStorageInfo,
    StateStorageInfo
} from "@/model/database-connection";
import {DatabaseConnectionType} from "@/state/connections/configs";
import {downloadOPFSFile, mountFilesOnWasm} from "@/state/connections/duckdb-wasm/utils";
import {DuckdbWasmProvider} from "@/state/connections/duckdb-wasm/duckdb-wasm-provider";
import {normalizeArrowType} from "@/components/relation/common/value-icon";
import {duckDBTypeToValueType, ValueType} from "@/model/value-type";
import {GetStateStorageStatus} from "@/state/persistency/duckdb-storage";
import {DEFAULT_STATE_STORAGE_DESTINATION, ERROR_MESSAGE_QUERY_ABORTED} from "@/platform/global-data";
import {AsyncQueue} from "@/platform/async-queue";
import {enqueueStatements} from "@/state/connections/utils";

export interface DuckDBWasmConfig {
    name: string;

    [key: string]: string | number | boolean | undefined; // index signature
}


export class DuckDBWasm implements DatabaseConnection {

    id: string;
    type: DatabaseConnectionType;
    connectionStatus: ConnectionStatus = {state: 'disconnected', message: 'ConnectionState not initialised'};
    storageInfo: StateStorageInfo = DefaultStateStorageInfo()

    dataSources: DataSource[];
    config: DuckDBWasmConfig;

    queue: AsyncQueue<string, RelationData>;

    constructor(config: DuckDBWasmConfig, id: string) {
        this.id = id;

        this.type = 'duckdb-wasm';
        this.dataSources = [];
        this.config = config;

        // to be able to use connection.send, we need to create a proper queue in order to avoid
        // sending multiple queries at the same time
        this.queue = new AsyncQueue<string, RelationData>((input) => this.executeQueryInternal(input));
    }


    canHandleMultiTab(): boolean {
        return false;
    }


    // close the duckdb connection on destroy
    async destroy(): Promise<void> {
        await DuckdbWasmProvider.getInstance().destroy();
    }

    async initialise(): Promise<ConnectionStatus> {
        return this.checkConnectionState();
    }

    async abortQuery(): Promise<void> {
        console.log("Aborting query");
        this.queue.cancelAll(ERROR_MESSAGE_QUERY_ABORTED);
        const {con} = await DuckdbWasmProvider.getInstance().getCurrentWasm();
        await con.cancelSent()
    }

    async executeQuery(sql: string): Promise<RelationData> {
        return enqueueStatements(sql, this.queue);
    }

    async executeQueryInternal(query: string): Promise<RelationData> {
        try {
            // if no signal is provided, create a new one that times out after DEFAULT_QUERY_TIMEOUT
            const {db, con} = await DuckdbWasmProvider.getInstance().getCurrentWasm();
            const result = await con.send(query, true);
            const data = await result.readAll();
            return relationFromDuckDBArrowResult("result", this.id, data);
        } catch (e: any) {
            // check if it is an error
            if (e instanceof Error) {
                if (e.message === '') {                // it is an abort error if there is an empty message
                    throw new Error(ERROR_MESSAGE_QUERY_ABORTED);
                }
            }
            throw e;
        }
    }


    async downloadDatabase(): Promise<void> {
        const opfs_path = DuckdbWasmProvider.getDatabasePath();
        // download the opfs database
        await downloadOPFSFile(opfs_path);
    }

    async mountFiles(files: File[]): Promise<void> {
        await mountFilesOnWasm(files, this);
        // await updateDataSources(duckDBWasm.id); todo

    }

    async checkConnectionState(): Promise<ConnectionStatus> {

        try {
            const versionResult = await this.executeQuery("select version();");
            const version = versionResult.rows[0][0] as string;
            console.log('DuckDB WASM version: ', version);
            this.storageInfo = await GetStateStorageStatus(DEFAULT_STATE_STORAGE_DESTINATION, this.executeQuery.bind(this));
            this.connectionStatus = {state: 'connected', message: `Connected to DuckDB WASM. Version: ${version}`};
        } catch (e: any) {
            const message = e.message;
            if (message.includes('createSyncAccessHandle')) {

                this.connectionStatus = {
                    state: 'error',
                    message: 'Failed to open the local database. This is likely because it is already in use by another browser tab.'
                };
                console.error('Failed to open the local database. Message: ', message);
            } else {
                this.connectionStatus = {state: 'error', message: e.message};
            }
        }

        return this.connectionStatus;
    }

    updateConfig(config: Partial<DuckDBWasmConfig>): void {
        this.config = {...this.config, ...config};
    }
}


/**
 * Recursively converts Arrow values from DuckDB results to plain JavaScript values.
 * Handles complex types like structs, maps, lists, and dates.
 *
 * @param value - The Arrow value to convert
 * @param normalized_type - The normalized type string (e.g., "Struct", "List", "Date")
 * @param type - The Arrow type object containing metadata about the value
 * @returns The converted JavaScript value
 */
function convertArrowValue(value: any, normalized_type: ValueType, type: any): any {
    // Handle null/undefined values early
    if (value === null || value === undefined) {
        return value;
    }

    try {
        // Handle Struct and Map types
        if (normalized_type.includes('Struct') || normalized_type.includes('Map')) {
            const is_map = normalized_type.includes('Map');
            const json_value = value.toJSON();

            if (!json_value || typeof json_value !== 'object') {
                return json_value;
            }

            const keys = Object.keys(json_value);
            const struct: { [key: string]: any } = {};
            const struct_type_children = type.children;

            if (!struct_type_children || !Array.isArray(struct_type_children)) {
                // Fallback: return the JSON value as-is if type info is missing
                return json_value;
            }

            for (let index = 0; index < keys.length; index++) {
                const key = keys[index];
                const child_value = json_value[key];

                // Safely access child type with bounds checking
                if (index >= struct_type_children.length) {
                    struct[key] = child_value;
                    continue;
                }

                let child_type = struct_type_children[index].type;

                // For maps, get the value type (second child of the map entry struct)
                if (is_map && child_type.children && child_type.children.length > 1) {
                    child_type = child_type.children[1].type;
                }

                const child_normalized_type = normalizeArrowType(child_type);
                struct[key] = convertArrowValue(child_value, child_normalized_type, child_type);
            }
            return struct;
        }
        // Handle List types
        else if (normalized_type.includes('List')) {
            const json_list = value.toJSON();

            if (!Array.isArray(json_list)) {
                return json_list;
            }

            // Get the element type from the type metadata
            const list_element_type_obj = type.children && type.children[0] ? type.children[0].type : null;

            if (!list_element_type_obj) {
                // Fallback: return the JSON list as-is if type info is missing
                return json_list;
            }

            const list_element_normalized_type = normalizeArrowType(list_element_type_obj);

            const list = [];
            for (const item of json_list) {
                // Recursively convert each item in the list
                const item_converted = convertArrowValue(item, list_element_normalized_type, list_element_type_obj);
                list.push(item_converted);
            }
            return list;
        }
        // Handle Date/Timestamp types
        else if (normalized_type.includes('Date') || normalized_type.includes('Timestamp')) {
            // Convert to a Date object
            return new Date(value);
        }

        // For primitive types (numbers, strings, booleans, etc.), return as-is
        return value;

    } catch (error) {
        // Log the error and return the original value as fallback
        console.error('Error converting Arrow value:', {
            value,
            normalized_type,
            error: error instanceof Error ? error.message : String(error)
        });
        return value;
    }
}

export function relationFromDuckDBArrowResult(relationName: string, connectionId: string, input: any): RelationData {

    // if the arrow result is not a list, make it a list
    let chunks: any[]
    if (!Array.isArray(input)) {
        chunks = [input]
    } else {
        chunks = input;
    }

    console.log(`Converting DuckDB Arrow result with ${chunks.length} chunks to RelationData, First chunk schema:`, chunks[0]);

    // Convert arrow tables to json
    let json: any[] = [];
    for (const chunk of chunks) {
        const tableJson: any[] = chunk.toArray().map((row: any) => row.toJSON());

        json = json.concat(tableJson);
    }

    // if the json is empty, return an empty relation
    if (json.length === 0 || chunks.length === 0) {
        return {
            columns: [],
            rows: []
        };
    }
    const firstRow = json[0];
    const firstChunk = chunks[0];
    const columns = Object.keys(firstRow);

    const rows = json.map((jsonRow: any) => {
        // the row is the list of values of the json map
        return columns.map((column) => jsonRow[column]);
    });
    const normalizedTypes = firstChunk.schema.fields.map((field: any) => {
        return duckDBTypeToValueType(normalizeArrowType(field.type));
    })

    const types = firstChunk.schema.fields.map((field: any) => {
        return field.type;
    });

    // make sure the values in the rows are completely flat
    rows.forEach((row: any, index: number) => {
        rows[index] = row.map((value: any, i: number) => {
            const normalizedType = normalizedTypes[i];
            const type = types[i];
            return convertArrowValue(value, normalizedType, type);
        });
    })


    return {
        columns: columns.map((column, index) => {
            return {
                id: column,
                name: column,
                type: normalizedTypes[index],
            }
        }),
        rows: rows,
    };
}