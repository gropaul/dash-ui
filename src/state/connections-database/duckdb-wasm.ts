import * as duckdb from "@duckdb/duckdb-wasm";
import {AsyncDuckDBConnection} from "@duckdb/duckdb-wasm";
import {RelationData} from "@/model/relation";
import {loadDuckDBDataSources} from "@/state/connections-source/duckdb-helper";
import {DataSource} from "@/model/data-source-connection";
import {ConnectionStatus, DatabaseConnection} from "@/model/database-connection";
import {DatabaseConnectionType} from "@/state/connections-database/configs";
import {importAndShowRelationsWithWASM} from "@/state/connections-database/duckdb-wasm/utils";
import {WasmProvider} from "@/state/connections-database/duckdb-wasm/connection-provider";

export interface DuckDBWasmConfig {
    name: string;
    persist_state: boolean;

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
        const {db, con} = await WasmProvider.getInstance().getWasm();
        const arrowResult = await con!.query(query);
        return relationFromDuckDBArrowResult('result', this.id, arrowResult);
    }

    async importFilesFromBrowser(files: File[]): Promise<void> {
        await importAndShowRelationsWithWASM(files, this);
        // await updateDataSources(duckDBWasm.id); todo

    }

    async checkConnectionState(): Promise<ConnectionStatus> {
        const connection = await WasmProvider.getInstance().getWasm();
        if (connection) {
            // test connection by running a simple query
            try {
                const versionResult = await this.executeQuery("select version();");
                const version = versionResult.rows[0][0] as string;
                this.connectionStatus = {state: 'connected', message: `Connected to DuckDB WASM. Version: ${version}`};
            } catch (e: any) {
                this.connectionStatus = {state: 'error', message: e.message};
            }
        } else {
            this.connectionStatus = {state: 'disconnected', message: 'DuckDB WASM not initialised'};
        }
        return this.connectionStatus;
    }

    updateConfig(config: Partial<DuckDBWasmConfig>): void {
        this.config = {...this.config, ...config};
    }
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

    const types = arrowResult.schema.fields.map((field: any) => {
        return field.type.toString()
    })

    return {
        columns: columns.map((column, index) => {
            return {
                id: column,
                name: column,
                type: types[index],
            }
        }),
        rows: rows,
    };
}
