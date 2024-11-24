import {
    DataConnection,
    DataConnectionState,
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

    async getDir(path: string, depth: number | undefined = 0): Promise<DataSourceGroup> {
        // get the children of the root directory
        const lsrPart = depth? `lsr('${path}', ${depth})` : `lsr('${path}')`;

        const fileSystemQuery = `SELECT path, is_file(path) as file, file_name(path) as basename
                                 FROM ${lsrPart}
                                 ORDER BY file, path;`;

        const fileSystemResult = await this.executeQuery(fileSystemQuery);
        const root: DataSourceGroup= {
            name: path,
            type: 'folder',
            childrenLoaded: true,
            children: []
        }
        const parents: Map<string, DataSourceGroup> = new Map();
        parents.set(path, root);

        for (const row of fileSystemResult.rows) {
            const [path, isFileString, basename] = row;
            const isFile = isFileString === 'true';
            // remove basename from path
            const parentPath = path.substring(0, path.length - basename.length - 1);
            const parent = parents.get(parentPath);

            if (isFile) {
                // assume parent is loaded
                parent!.children.push({
                    name: basename,
                    type: 'file'
                });

                // set children loaded to true
                parent!.childrenLoaded = true;
            } else {
                // add to parents
                const folder: DataSourceGroup = {
                    name: basename,
                    type: 'folder',
                    childrenLoaded: false,
                    children: []
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
        const rootPath = rootDirectory.rows[0][1];

        const rootDataSource: DataSourceGroup = await this.getDir(rootPath, 1);

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

        const connectionId = this.config.duckdbConnectionId;
        const schema = DUCKDB_BASE_SCHEMA;
        const database = DUCKDB_IN_MEMORY_DB;
        const relationName = base_path;

        const loadCsvQuery = `CREATE TABLE IF NOT EXISTS "${relationName}" AS
                              SELECT *
                              FROM read_csv('${path}', AUTO_DETECT = TRUE);`;

        await this.executeQuery(loadCsvQuery);



        // update data sources
        await useConnectionsState.getState().updateDataSources(this.config.duckdbConnectionId);
        // show the table
        await useRelationsState.getState().showRelationByName(this.id, database, schema, relationName);

    }
}


