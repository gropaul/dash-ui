import {DataConnection} from "@/state/connections.state";


export class ConnectionsService {
    // singleton instance
    private static instance: ConnectionsService;

    connections: { [key: string]: DataConnection };

    private constructor() {
        this.connections = {};
    }

    static getInstance(): ConnectionsService {
        if (!ConnectionsService.instance) {
            ConnectionsService.instance = new ConnectionsService();
        }
        return ConnectionsService.instance;
    }

    addConnection(connection: DataConnection) {
        this.connections[connection.id] = connection;
    }

    async executeQuery(connectionId: string, query: string) {
        const connection = this.connections[connectionId];
        if (!connection) {
            throw new Error(`Connection with id ${connectionId} not found`);
        }
        return connection.executeQuery(query);
    }




}