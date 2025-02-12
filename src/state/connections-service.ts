import {SourceConnectionZustand} from "@/state/connections-source.state";
import {getDuckDBLocalConnection} from "@/state/connections-database/duckdb-over-http";
import {getDuckDBLocalFilesystem} from "@/state/connections-source/duckdb-local-filesystem";
import {DataSourceConnection} from "@/model/data-source-connection";
import {removeSemicolon} from "@/platform/sql-utils";
import {ConnectionStatus, DatabaseConnection} from "@/model/database-connection";
import {getDuckDBInternalDatabase} from "@/state/connections-source/duckdb-internal-databases";


export class ConnectionsService {
    // singleton instance
    private static instance: ConnectionsService;

    // there is always only one active database connection
    database_connection?: DatabaseConnection;

    // there can be multiple data source connections
    source_connections: { [key: string]: DataSourceConnection };

    private constructor() {
        this.source_connections = {};
    }

    static getInstance(): ConnectionsService {
        if (!ConnectionsService.instance) {
            ConnectionsService.instance = new ConnectionsService();
        }
        return ConnectionsService.instance;
    }

    hasDatabaseConnection() {
        return this.database_connection !== undefined;
    }

    setDatabaseConnection(connection: DatabaseConnection) {
        this.database_connection = connection;
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

    async executeQuery(query: string) {
        if (!this.database_connection) {
            throw new Error('No active database connection');
        }
        return await this.database_connection.executeQuery(query);
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
        const explainQuery = `EXPLAIN ${preparedSQL}`

        try {
            const _result = await this.executeQuery(explainQuery);
            return true;
        } catch (e) {
            return false;
        }
    }
}