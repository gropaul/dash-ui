import {
    DataConnection, DataConnectionState,
    DataSource,
    DataSourceElement,
    DataSourceGroup,
    DBConnectionType, useConnectionsState
} from "@/state/connections.state";
import {FormDefinition} from "@/components/basics/input/custom-form";
import {RelationData} from "@/model/relation";
import {
    CONNECTION_ID_DUCKDB_LOCAL,
    CONNECTION_ID_FILE_SYSTEM_OVER_DUCKDB, DUCKDB_IN_MEMORY_DB,
    DUCKDB_BASE_SCHEMA
} from "@/platform/global-data";
import {ConnectionsService} from "@/state/connections/connections-service";
import {useRelationsState} from "@/state/relations.state";
import {findNodeInTrees, findNodeParent, findNodeParentInTrees} from "@/components/basics/tree-explorer/tree-utils";

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

    async getDirAsDataSource(rootPath: string, rootName: string, depth: number | undefined): Promise<DataSourceGroup> {
        // get the children of the root directory
        const lsrPart = depth !== undefined ? `lsr('${rootPath}', ${depth})` : `lsr('${rootPath}')`;

        const fileSystemQuery = `SELECT path, is_file(path) as file, file_name(path) as basename
                                 FROM ${lsrPart}
                                 ORDER BY file, path;`;

        const fileSystemResult = await this.executeQuery(fileSystemQuery);
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
                    type: 'file'
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
        // install hostfs on duckdb
        const installHostFs = `INSTALL hostfs FROM community;
                               LOAD hostfs;`;
        await this.executeQuery(installHostFs);
        // get the root directory
        const rootDirectoryQuery = `SELECT file_name(pwd()),pwd();`;
        const rootDirectory = await this.executeQuery(rootDirectoryQuery);
        const rootName = rootDirectory.rows[0][0];
        const rootPath = rootDirectory.rows[0][1];

        const rootDataSource: DataSourceGroup = await this.getDirAsDataSource(rootPath, rootName, 0);
        return [rootDataSource];
    }

    async onDataSourceClick(id_path: string[]) {
        const path = id_path.join('/');
        // if csv file, load the file
        const isCsv = path.endsWith('.csv');
        if (!isCsv) {
            return;
        }

        // last element is the file name
        const base_path = id_path[id_path.length - 1];

        const schema = DUCKDB_BASE_SCHEMA;
        const database = DUCKDB_IN_MEMORY_DB;
        const relationName = base_path;

        const loadCsvQuery = `CREATE TABLE IF NOT EXISTS "${relationName}" AS
        SELECT *
        FROM read_csv('${path}', AUTO_DETECT = TRUE);`;

        await this.executeQuery(loadCsvQuery);


        // update data sources
        await useConnectionsState.getState().loadAllDataSources(this.config.duckdbConnectionId);
        // show the table
        await useRelationsState.getState().showRelationByName(this.id, database, schema, relationName);

    }

    async loadChildrenForDataSource(id_path: string[]): Promise<DataSource[]> {
        const tree = this.dataSources;
        const node = findNodeInTrees(tree, id_path);

        if (!node) {
            console.error('Parent not found');
            return [];
        }

        const groupLoaded = await this.getDirAsDataSource(node.id, node.name, 0);
        return groupLoaded.children!;
    }

    dataSources: DataSource[] = [];
}

