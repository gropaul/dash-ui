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
import {DEFAULT_STATE_STORAGE_DESTINATION} from "@/platform/global-data";
import {MdWasmConfig, MdWasmProvider} from "@/state/connections/md-wasm/md-wasm-provider";
import {resultToRelationData} from "@/state/connections/md-wasm/utils";

export interface MdWasmConnectionConfig extends MdWasmConfig {
    name: string;
    [key: string]: string | number | boolean | undefined; // index signature
}


export class MdWasm implements DatabaseConnection {

    id: string;
    type: DatabaseConnectionType;
    connectionStatus: ConnectionStatus = {state: 'disconnected', message: 'Connection not initialised'};
    storageInfo: StateStorageInfo = DefaultStateStorageInfo()

    dataSources: DataSource[];
    config: MdWasmConnectionConfig;

    constructor(config: MdWasmConnectionConfig, id: string) {
        this.id = id;

        this.type = 'duckdb-wasm';
        this.dataSources = [];
        this.config = config;

        MdWasmProvider.getInstance().setConfig(config);
    }

    canHandleMultiTab(): boolean {
        return true;
    }

    // close the duckdb connection on destroy
    async destroy(): Promise<void> {
        await MdWasmProvider.getInstance().destroy();
    }

    async initialise(): Promise<ConnectionStatus> {
        return this.checkConnectionState();
    }

    async executeQuery(query: string): Promise<RelationData> {
        const {con} = await MdWasmProvider.getInstance().getCurrentWasm();
        const res = await con.evaluateQuery(query);
        return resultToRelationData(res);
    }

    async mountFiles(files: File[]): Promise<void> {
    }

    async checkConnectionState(): Promise<ConnectionStatus> {

        try {
            const versionResult = await this.executeQuery("select version();");
            const version = versionResult.rows[0][0] as string;
            console.log('DuckDB WASM version: ', version);
            this.storageInfo = await GetStateStorageStatus(DEFAULT_STATE_STORAGE_DESTINATION, this.executeQuery.bind(this));
            this.connectionStatus = {state: 'connected', message: `Connected to Motherduck WASM. Version: ${version}`};
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

    updateConfig(config: Partial<MdWasmConnectionConfig>): void {
        this.config = {...this.config, ...config};
        MdWasmProvider.getInstance().setConfig(this.config);
    }
}


function convertArrowValue(value: any, normalized_type: ValueType, type: any): any {
    // field.type tells you if it's a struct, list, etc.
    // Recursively navigate
    if (normalized_type.includes('Struct')) {

        const json_value = value.toJSON();

        const keys = Object.keys(json_value);
        let struct: {[key: string]: any} = {};
        const struct_type_children = type.children;
        let index = 0;
        for (const key of keys) {
            // Recursively convert each item in the struct
            const child_value = json_value[key];
            const child_type = struct_type_children[index].type;
            const child_normalized_type = normalizeArrowType(child_type);
            struct[key] = convertArrowValue(child_value, child_normalized_type, child_type);
            index++;
        }
        return struct;
    }
    else if (normalized_type.includes('List')) {
        const json_list =  value.toJSON();
        const list_element_type = normalizeArrowType(value.type);

        let list = [];
        for (const item of json_list) {
            // Recursively convert each item in the list
            const item_flat = convertArrowValue(item, list_element_type, value.type);
            list.push(item_flat);
        }
        return list;
    } else if (normalized_type.includes('Date')) {
        // Convert to a date object
        // return value;
        return new Date(value);

    }

    // For a primitive type, just return as is
    return value;
}

export function relationFromDuckDBArrowResult(relationName: string, connectionId: string, arrowResult: any): RelationData {

    // Convert arrow table to json
    const json = arrowResult.toArray().map((row: any) => row.toJSON());
    // if the json is empty, return an empty relation
    if (json.length === 0) {
        return {
            columns: [],
            rows: []
        };
    }
    const firstRow = json[0];
    const columns = Object.keys(firstRow);

    const rows = json.map((jsonRow: any) => {
        // the row is the list of values of the json map
        return columns.map((column) => jsonRow[column]);
    });
    const normalizedTypes = arrowResult.schema.fields.map((field: any) => {
        return duckDBTypeToValueType(normalizeArrowType(field.type));
    })

    const types = arrowResult.schema.fields.map((field: any) => {
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
