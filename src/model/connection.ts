import {FormDefinition} from "@/components/basics/input/custom-form";
import {RelationData} from "@/model/relation";
import {TreeNode} from "@/components/basics/files/tree-utils";
import {Column} from "@/model/column";
import {TreeContextMenuFactory} from "@/components/basics/files/tree-explorer";

export type DBConnectionType = 'duckdb-wasm' | 'duckdb-over-http' | 'local-filesystem-over-duckdb';
export type DataSourceType = 'file' | 'relation';
export type DataGroupType = 'folder' | 'database' | 'schema';

export type DataSourceElement = TreeNode<Column, DataSourceType>
export type DataSourceGroup = TreeNode<DataSource, DataGroupType>;
export type DataSource = DataSourceElement | DataSourceGroup;


export interface ConnectionStatus {
    state: 'connected' | 'disconnected' | 'connecting' | 'error';
    message?: string;
}

export type DataConnectionConfig = { [key: string]: string | number | boolean | undefined };

export interface DataConnection {
    id: string;

    config: DataConnectionConfig
    configForm: FormDefinition;

    type: DBConnectionType;
    connectionStatus: ConnectionStatus;
    dataSources: DataSource[];

    executeQuery: (query: string) => Promise<RelationData>;
    loadDataSources: () => Promise<DataSource[]>;

    initialise: () => Promise<ConnectionStatus>;
    checkConnectionState: () => Promise<ConnectionStatus>;

    onDataSourceClick: (id_path: string[]) => void;
    dataSourceContextMenuFactory?: TreeContextMenuFactory;
    loadChildrenForDataSource: (id_path: string[]) => Promise<DataSource[]>;

    updateConfig: (config: Partial<DataConnectionConfig>) => void;
}