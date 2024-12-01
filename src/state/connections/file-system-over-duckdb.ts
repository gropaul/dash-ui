import {useConnectionsState} from "@/state/connections.state";
import {FormDefinition} from "@/components/basics/input/custom-form";
import {RelationData, RelationSource} from "@/model/relation";
import {
    CONNECTION_ID_DUCKDB_LOCAL,
    CONNECTION_ID_FILE_SYSTEM_OVER_DUCKDB,
    DUCKDB_BASE_SCHEMA,
    DUCKDB_IN_MEMORY_DB
} from "@/platform/global-data";
import {ConnectionsService} from "@/state/connections/connections-service";
import {useRelationsState} from "@/state/relations.state";
import {findNodeInTrees} from "@/components/basics/tree-explorer/tree-utils";
import {ConnectionState, DataConnection, DataSource, DataSourceGroup, DBConnectionType} from "@/model/connection";
import {getDuckDBCurrentPath} from "@/state/connections/duckdb-helper";
import * as path from 'path';
import {DuckDBOverHttpConfig} from "@/state/connections/duckdb-over-http";

export async function getFileSystemOverDuckdbConnection(): Promise<DataConnection> {

    const executeQuery = ConnectionsService.getInstance().getConnection(CONNECTION_ID_DUCKDB_LOCAL).executeQuery;
    const [rootName, rootPath] = await getDuckDBCurrentPath(executeQuery);
    return new FileSystemOverDuckdb(CONNECTION_ID_FILE_SYSTEM_OVER_DUCKDB, {
        rootPath: rootPath,
        name: 'Local Filesystem',
        duckdbConnectionId: CONNECTION_ID_DUCKDB_LOCAL
    });
}

interface FileSystemOverDuckDBConfig {
    name: string;
    duckdbConnectionId: string;
    rootPath: string;
    [key: string]: string | number | boolean | undefined;
}

export class FileSystemOverDuckdb implements DataConnection {
    config: FileSystemOverDuckDBConfig;
    id: string;
    type: DBConnectionType = 'local-filesystem-over-duckdb';
    configForm: FormDefinition = {
        fields: [
            {
                type: 'text',
                label: 'Name',
                key: 'name',
                required: true
            },
            {
                type: 'text',
                label: 'Root Path',
                key: 'rootPath',
                required: true
            }
        ],
    }

    constructor(id: string, config: FileSystemOverDuckDBConfig) {
        this.id = id;
        this.config = config;
    }

    executeQuery(query: string): Promise<RelationData> {
        return ConnectionsService.getInstance().executeQuery(this.config.duckdbConnectionId, query);
    }

    getConnectionState(): Promise<ConnectionState> {
        return ConnectionsService.getInstance().getConnection(this.config.duckdbConnectionId).getConnectionState();
    }

    initialise(): Promise<ConnectionState> {
        return ConnectionsService.getInstance().getConnection(this.config.duckdbConnectionId).getConnectionState();
    }

    async getDirAsDataSource(rootPath: string, depth: number | undefined): Promise<DataSourceGroup> {
        // get the children of the root directory
        const lsrPart = depth !== undefined ? `lsr('${rootPath}', ${depth})` : `lsr('${rootPath}')`;

        const fileSystemQuery = `SELECT path, is_file(path) as file, file_name(path) as basename
                                 FROM ${lsrPart}
                                 ORDER BY file, path;`;

        const fileSystemResult = await this.executeQuery(fileSystemQuery);

        // get rootName as basepath, could be Unix or Windows path
        const rootName = path.basename(rootPath);
        const root: DataSourceGroup = {
            id: rootPath,
            name: rootName,
            type: 'folder',
            children: []
        }
        const parents: Map<string, DataSourceGroup> = new Map();
        parents.set(rootPath, root);

        for (const row of fileSystemResult.rows) {
            const [path, isFileString, basename] = row;
            const isFile = isFileString === 'true';
            // remove basename from path
            const parentPath = path.substring(0, path.length - basename.length - 1);
            const parent = parents.get(parentPath);

            // set parent children to empty array if not loaded
            if (!parent!.children) {
                parent!.children = [];
            }

            if (isFile) {
                // assume parent is loaded
                parent!.children.push({
                    id: path,
                    name: basename,
                    type: 'file',
                    children: null
                });
            } else {
                // add to parents
                const folder: DataSourceGroup = {
                    id: path,
                    name: basename,
                    type: 'folder',
                    children: undefined
                }
                parents.set(path, folder);
                parent!.children.push(folder);
            }
        }
        return root;
    }

    async loadDataSources(): Promise<DataSource[]> {
        const rootPath = this.config.rootPath;
        const rootDataSource: DataSourceGroup = await this.getDirAsDataSource(rootPath, 0);
        return [rootDataSource];
    }

    async onDataSourceClick(id_path: string[]) {

        const lastId = id_path[id_path.length - 1];
        const element = await findNodeInTrees(this.dataSources, id_path);

        if (!element) {
            console.error(`Element with id ${lastId} not found`);
            return;
        }

        if (element.type !== 'file') {
            return
        }

        const source: RelationSource = {
            type: 'file',
            path: lastId,
            baseName: element.name
        }

        // show the table
        await useRelationsState.getState().showRelationFromSource(this.id, source);
    }

    async loadChildrenForDataSource(id_path: string[]): Promise<DataSource[]> {
        const last_id = id_path[id_path.length - 1];
        const path_root = await this.getDirAsDataSource(last_id, 0);
        return path_root.children!;
    }

    updateConfig(new_config: Partial<FileSystemOverDuckDBConfig>): void {


        // if the base path changes, reload the data sources
        if (new_config.rootPath && new_config.rootPath !== this.config.rootPath) {
            this.config = {...this.config, ...new_config};
            useConnectionsState.getState().loadAllDataSources(this.id);
        } else {
            this.config = {...this.config, ...new_config};
        }

    }

    dataSources: DataSource[] = [];
}

