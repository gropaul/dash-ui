import {
    DataConnection,
    DataConnectionState,
    DataSource, DataSourceElement, DataSourceGroup,
    DBConnectionType
} from "@/state/connections.state";
import {FormDefinition} from "@/components/basics/input/custom-form";
import {RelationData} from "@/model/relation";
import {CONNECTION_ID_DUCKDB_LOCAL, CONNECTION_ID_FILE_SYSTEM_OVER_DUCKDB} from "@/platform/global-data";
import {ConnectionsService} from "@/state/connections/connections-service";

export function getFileSystemOverDuckdbConnection(): DataConnection {
    return new FileSystemOverDuckdb(CONNECTION_ID_FILE_SYSTEM_OVER_DUCKDB, {
        name: 'Local Filesystem',
        duckdbConnectionId: CONNECTION_ID_DUCKDB_LOCAL
    });
}

interface FileSystemOverDuckdbConfig {
    name: string;
    duckdbConnectionId: string;

    [key: string]: string | number | boolean | undefined;
}

export class FileSystemOverDuckdb implements DataConnection {
    config: FileSystemOverDuckdbConfig;
    dataSources: DataSource[];
    id: string;
    type: DBConnectionType = 'local-filesystem-over-duckdb';
    configForm: FormDefinition = {
        fields: [
            {
                type: 'text',
                label: 'Name',
                key: 'name',
                required: true
            }
        ],
    }

    constructor(id: string, config: FileSystemOverDuckdbConfig) {
        this.id = id;
        this.config = config;
        this.dataSources = [];
    }

    executeQuery(query: string): Promise<RelationData> {
        return ConnectionsService.getInstance().executeQuery(this.config.duckdbConnectionId, query);
    }

    getConnectionState(): Promise<DataConnectionState> {
        return ConnectionsService.getInstance().getConnection(this.config.duckdbConnectionId).getConnectionState();
    }

    initialise(): Promise<DataConnectionState> {
        return ConnectionsService.getInstance().getConnection(this.config.duckdbConnectionId).getConnectionState();
    }

    async loadDataSources(): Promise<DataSource[]> {
        // install hostfs on duckdb
        const installHostFs = `INSTALL hostfs FROM community;
                               LOAD hostfs;`;
        await this.executeQuery(installHostFs);


        // get the children of the root directory
        const fileSystemQuery = `SELECT is_file(path), path
                                 FROM ls();`;
        const fileSystem = await this.executeQuery(fileSystemQuery);
        const children: DataSource[] = fileSystem.rows.map(row => {
            const is_file = row[0];
            const path = row[1];
            if (is_file) {
                const element: DataSourceElement = {
                    name: path,
                    type: 'file',
                    children: []
                }
                return element;
            } else {
                const element: DataSourceGroup = {
                    name: path,
                    type: 'folder',
                    children: []
                }
                return element;
            }
        });

        // get the root directory
        const rootDirectoryQuery = `SELECT file_name(pwd()),pwd();`;
        const rootDirectory = await this.executeQuery(rootDirectoryQuery);
        const rootPath = rootDirectory.rows[0][1];

        const rootDataSource: DataSourceGroup = {
            name: rootDirectory.rows[0][0],
            type: 'folder',
            children: children,
        }

        return [rootDataSource];
    }
}


