import {RelationData} from "@/model/relation";
import {DataSource} from "@/model/data-source-connection";
import {
    ConnectionStatus,
    DatabaseConnection,
    DefaultStateStorageInfo,
    StateStorageInfo
} from "@/model/database-connection";
import {DatabaseConnectionType} from "@/state/connections/configs";
import {GetStateStorageStatus} from "@/state/persistency/duckdb-storage";
import {DEFAULT_STATE_STORAGE_DESTINATION} from "@/platform/global-data";
import {MdWasmConfig, MdWasmProvider, resultToRelationData} from "@/state/connections/md-wasm/md-wasm-provider";

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

    async abortQuery(): Promise<void> {
        throw new Error("Abort query is not supported for DuckDB Over HTTP");
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

    updateConfig(config: Partial<MdWasmConnectionConfig>): Promise<void> {
        this.config = {...this.config, ...config};
        return MdWasmProvider.getInstance().setConfig(this.config);
    }
}
