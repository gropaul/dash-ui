import {RelationData} from "@/model/relation";
import {DataSource} from "@/model/data-source-connection";
import {ConnectionStatus, DatabaseConnection} from "@/model/database-connection";
import {DatabaseConnectionType} from "@/state/connections-database/configs";
import {importAndShowRelationsWithWASM} from "@/state/connections-database/duckdb-wasm/utils";
import {WasmProvider} from "@/state/connections-database/duckdb-wasm/connection-provider";
import {normalizeArrowType, ValueType} from "@/components/relation/common/value-icon";

export interface DuckDBWasmConfig {
    name: string;
    [key: string]: string | number | boolean | undefined; // index signature
}

export class DuckDBWasm implements DatabaseConnection {

    id: string;
    type: DatabaseConnectionType;
    connectionStatus: ConnectionStatus = {state: 'disconnected', message: 'ConnectionState not initialised'};

    dataSources: DataSource[];
    config: DuckDBWasmConfig;

    constructor(config: DuckDBWasmConfig, id: string) {
        this.id = id;

        this.type = 'duckdb-wasm';
        this.dataSources = [];
        this.config = config;
    }

    // close the duckdb connection on destroy
    async destroy(): Promise<void> {

    }

    async initialise(): Promise<ConnectionStatus> {
        return this.checkConnectionState();
    }

    async executeQuery(query: string): Promise<RelationData> {
        const {db, con} = await WasmProvider.getInstance().getCurrentWasm();
        const arrowResult = await con!.query(query);
        // checkpoint the database
        await con.query('CHECKPOINT;');
        const result = relationFromDuckDBArrowResult('result', this.id, arrowResult);
        return result;
    }

    async importFilesFromBrowser(files: File[]): Promise<void> {
        await importAndShowRelationsWithWASM(files, this);
        // await updateDataSources(duckDBWasm.id); todo

    }

    async checkConnectionState(): Promise<ConnectionStatus> {

        try {
            const versionResult = await this.executeQuery("select version();");
            const version = versionResult.rows[0][0] as string;
            this.connectionStatus = {state: 'connected', message: `Connected to DuckDB WASM. Version: ${version}`};
        } catch (e: any) {
            const message = e.message;
            if (message.includes('createSyncAccessHandle')) {
                this.connectionStatus = {
                    state: 'error',
                    message: 'Failed to open the local database. This is likely because it is already in use by another browser tab.'
                };
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
        return normalizeArrowType(field.type);
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
