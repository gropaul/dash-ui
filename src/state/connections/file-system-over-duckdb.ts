import {useConnectionsState} from "@/state/connections.state";
import {FormDefinition} from "@/components/basics/input/custom-form";
import {RelationData, RelationSource} from "@/model/relation";
import {
    CONNECTION_ID_DUCKDB_LOCAL,
    CONNECTION_ID_FILE_SYSTEM_OVER_DUCKDB,
    DEFAULT_RELATION_VIEW_PATH,
} from "@/platform/global-data";
import {ConnectionsService} from "@/state/connections/connections-service";
import {useRelationsState} from "@/state/relations.state";
import {findNodeInTrees, TreeNode} from "@/components/basics/files/tree-utils";
import {ConnectionStatus, DataConnection, DataSource, DataSourceGroup, DBConnectionType} from "@/model/connection";
import {getDuckDBCurrentPath} from "@/state/connections/duckdb-helper";
import * as path from 'path';
import {ReactNode} from "react";
import ContextMenuFactory from "@/state/connections/file-system-over-duckdb/context-menu-factory";

export async function getFileSystemOverDuckdbConnection(): Promise<DataConnection> {
    return new FileSystemOverDuckdb(CONNECTION_ID_FILE_SYSTEM_OVER_DUCKDB, {
        rootPath: undefined,
        name: 'Filesystem',
        showHiddenFiles: false,
        duckdbConnectionId: CONNECTION_ID_DUCKDB_LOCAL
    });
}

interface FileSystemOverDuckDBConfig {
    name: string;
    duckdbConnectionId: string;
    rootPath?: string;
    showHiddenFiles: boolean;

    [key: string]: string | number | boolean | undefined;
}

export class FileSystemOverDuckdb implements DataConnection {
    config: FileSystemOverDuckDBConfig;
    id: string;
    type: DBConnectionType = 'local-filesystem-over-duckdb';
    connectionStatus: ConnectionStatus = {state: 'disconnected', message: 'ConnectionState not initialised'};
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
            },
            {
                type: 'boolean',
                label: 'Show Hidden Files',
                key: 'showHiddenFiles',
                required: false
            }
        ],
    }
    dataSources: DataSource[] = [];

    constructor(id: string, config: FileSystemOverDuckDBConfig) {
        this.id = id;
        this.config = config;
    }

    executeQuery(query: string): Promise<RelationData> {
        return ConnectionsService.getInstance().executeQuery(this.config.duckdbConnectionId, query);
    }

    async checkConnectionState(): Promise<ConnectionStatus> {
        this.connectionStatus = await useConnectionsState.getState().updateConnectionState(this.config.duckdbConnectionId);
        return this.connectionStatus;
    }

    async initialise(): Promise<ConnectionStatus> {

        // install hostfs from community extensions
        try {
            await this.executeQuery('INSTALL hostfs FROM community;');
            await this.executeQuery('LOAD hostfs;');
        } catch (e) {
            console.error('Error installing hostfs', e);
            return Promise.resolve({state: 'error', message: 'Error installing hostfs'});
        }
        console.log('Loading root path');
        const [_rootName, rootPath] = await getDuckDBCurrentPath( this.executeQuery.bind(this));
        console.log('This:', this);
        this.config.rootPath = rootPath;
        console.log('Root path loaded', rootPath);
        return this.checkConnectionState();

    }

    async getDirAsDataSource(rootPath: string, depth: number | undefined): Promise<DataSourceGroup> {
        // get the children of the root directory
        const lsrPart = depth !== undefined ? `lsr('${rootPath}', ${depth})` : `lsr('${rootPath}')`;

        const showHiddenFiles = this.config.showHiddenFiles;

        const hiddenFilesCondition = showHiddenFiles ? '' : "WHERE file_name(path) NOT LIKE '.%'";

        const fileSystemQuery = `SELECT path, is_file(path) as file, file_name(path) as basename
                                 FROM ${lsrPart} ${hiddenFilesCondition}
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
            const isFile = isFileString === true || isFileString === 'true';
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

        if (!rootPath) {
            throw new Error('Root path not set, please initialise the connection');
        }
        const rootDataSource: DataSourceGroup = await this.getDirAsDataSource(rootPath, 0);
        return [rootDataSource];
    }

    async onDataSourceClick(id_path: string[]) {

        const lastId = id_path[id_path.length - 1];
        const element = findNodeInTrees(this.dataSources, id_path);

        if (!element) {
            console.error(`Element with id ${lastId} not found`);
            return;
        }

        if (element.type !== 'file') {
            // const showDirectory = useRelationsState.getState().showDirectory;
            // await showDirectory(this.id, id_path, element as DataSourceGroup);
        } else {
            const source: RelationSource = {
                type: 'file',
                path: lastId,
                baseName: element.name
            }

            // show the table
            await useRelationsState.getState().showRelationFromSource(this.id, source, DEFAULT_RELATION_VIEW_PATH);
        }
    }

    async loadChildrenForDataSource(id_path: string[]): Promise<DataSource[]> {
        const last_id = id_path[id_path.length - 1];
        const path_root = await this.getDirAsDataSource(last_id, 0);
        return path_root.children!;
    }

    async updateConfig(new_config: Partial<FileSystemOverDuckDBConfig>): Promise<void> {
        // check if the root path is a valid path e.g. not end with a /
        if (new_config.rootPath && new_config.rootPath.endsWith('/')) {
            new_config.rootPath = new_config.rootPath.substring(0, new_config.rootPath.length - 1);
        }

        // if the base path changes, reload the data sources
        if (new_config.rootPath && new_config.rootPath !== this.config.rootPath) {
            this.config = {...this.config, ...new_config};
        } else {
            this.config = {...this.config, ...new_config};
        }

    }

    dataSourceContextMenuFactory = (tree_id_path: string[], tree: TreeNode): ReactNode => {
        return ContextMenuFactory({tree_id_path, tree, connection_id: this.id});
    }

}

