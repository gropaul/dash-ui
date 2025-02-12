import {TreeNode} from "@/components/basics/files/tree-utils";
import {Column} from "@/model/column";
import {TreeContextMenuFactory} from "@/components/basics/files/tree-explorer";
import {ConnectionStatus} from "@/model/database-connection";

export type DataSourceConnectionType = 'duckdb-internal-databases' | 'duckdb-local-filesystem';
export type DataSourceType = 'file' | 'relation';
export type DataGroupType = 'folder' | 'database' | 'schema';

export type DataSourceElement = TreeNode<Column, DataSourceType>
export type DataSourceGroup = TreeNode<DataSource, DataGroupType>;
export type DataSource = DataSourceElement | DataSourceGroup;

export type DataConnectionConfig = { [key: string]: string | number | boolean | undefined };

//! A DataSourceConnection manages DataSources that are accessible through a DatabaseConnection. For 
//! example, a LocalFile DataSourceConnection can access the local files via a LocalDuckDBDatabaseConnection.
//! But also a DuckDBTables DataSourceConnection can access tables in a e.g. DuckDBWasmDatabaseConnection.
export interface DataSourceConnection {

    id: string;
    type: DataSourceConnectionType;

    config: DataConnectionConfig
    updateConfig: (config: Partial<DataConnectionConfig>) => void;

    connectionStatus: ConnectionStatus;
    initialise: () => Promise<ConnectionStatus>;
    checkConnectionState: () => Promise<ConnectionStatus>;

    dataSources: DataSource[];
    loadDataSources: () => Promise<DataSource[]>;
    loadChildrenForDataSource: (id_path: string[]) => Promise<DataSource[]>;
    onDataSourceClick: (id_path: string[]) => void;
    dataSourceContextMenuFactory?: TreeContextMenuFactory;

}