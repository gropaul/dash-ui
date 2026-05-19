import {DataSourceConnection} from "@/model/data-source-connection";
import {removeSemicolon} from "@/platform/sql-utils";
import {ConnectionStatus, DatabaseConnection} from "@/model/database-connection";
import {getLogQueries} from "@/components/settings/about-content";
import {initDashCatalog} from "@/state/connections/utils";
import {getQuerySchema} from "@/model/relation-state/query-builder/schema";

type DatabaseConnectionCallback = (connection: DatabaseConnection | undefined) => void;

export class ConnectionsService {
    // singleton instance
    private static instance: ConnectionsService;

    // there is always only one active database connection
    database_connection?: DatabaseConnection;

    // there can be multiple data source connections
    source_connections: { [key: string]: DataSourceConnection };
    databaseConnectionCallbacks: Set<DatabaseConnectionCallback>;

    private constructor() {
        this.source_connections = {};
        this.databaseConnectionCallbacks = new Set();
    }

    static getInstance(): ConnectionsService {
        if (!ConnectionsService.instance) {
            ConnectionsService.instance = new ConnectionsService();
        }
        return ConnectionsService.instance;
    }

    onDatabaseConnectionChange(callback: DatabaseConnectionCallback): () => void {
        this.databaseConnectionCallbacks.add(callback);
        // Return an unsubscribe function
        return () => {
            this.databaseConnectionCallbacks.delete(callback);
        };
    }

    private notifyDatabaseConnectionChange() {
        for (const callback of this.databaseConnectionCallbacks) {
            callback(this.database_connection);
        }
    }

    hasDatabaseConnection() {
        return this.database_connection !== undefined;
    }

    async setDatabaseConnection(connection: DatabaseConnection) {
        this.database_connection = connection;
        await initDashCatalog(connection);
        this.notifyDatabaseConnectionChange();
    }

    getDatabaseConnection(): DatabaseConnection {
        if (!this.database_connection) {
            throw new Error('No active database connection');
        }
        return this.database_connection;
    }

    getSourceConnection(connectionId: string) {
        return this.source_connections[connectionId];
    }

    hasSourceConnection(connectionId: string) {
        if (this.source_connections[connectionId]) {
            return true;
        } else {
            return false;
        }
    }

    addSourceConnectionIfNotExists(connection: DataSourceConnection) {
        if (!this.source_connections[connection.id]) {
            this.source_connections[connection.id] = connection;
        }
    }

    clearSourceConnections() {
        this.source_connections = {};
    }

    async executeQuery(query: string, readOnly: boolean = false) {
        if (!this.database_connection) {
            throw new Error('No active database connection');
        }
        if (getLogQueries()) {
            console.log(`[Query]${readOnly ? ' (read-only)' : ''}`, query);
        }
        return await this.database_connection.executeQuery(query, readOnly);
    }

    async abortQuery(): Promise<boolean> {
        if (!this.database_connection) {
            throw new Error('No active database connection');
        }
        return await this.database_connection.abortQuery();
    }

    async getDatabaseConnectionState(): Promise<ConnectionStatus> {
        if (!this.database_connection) {
            throw new Error('No active database connection');
        }
        return await this.database_connection.checkConnectionState();
    }

    updateSourceConnectionConfig(id: string, config: any) {
        const connection = this.source_connections[id];
        if (!connection) {
            throw new Error(`Connection with id ${id} not found`);
        }
        // update all the fields in the config
        connection.updateConfig(config);
    }

    async checkIfQueryIsExecutable(sql: string) {

        const preparedSQL = removeSemicolon(sql)
        console.log('Test: prep', preparedSQL)

        try {
            await getQuerySchema(preparedSQL)
            return true;
        } catch (e) {
            console.error(e, 'Query is not executable', preparedSQL);
            return false;
        }
    }
}