import React, {ReactNode} from "react";
import {
    Calendar,
    Database,
    File,
    FileWarning,
    Folder,
    Hash,
    Layers3,
    Network,
    Sheet,
    Text,
    ToggleLeft
} from "lucide-react";


export type DBConnectionType = 'duckdb-wasm' | 'duckdb-over-http' | 'local-filesystem';
export type DataSourceType = 'file' | 'relation';
export type DataGroupType = 'folder' | 'database';

export type PossibleIconTypes = DataSourceType | DataGroupType | DBConnectionType;

export const defaultIconFactory = (type: string): ReactNode => {
    const iconSize = 16;

    switch (type) {
        case 'file':
            return <File size={iconSize} />
        case 'relation':
            return <Sheet size={iconSize} />
        case 'folder':
            return <Folder size={iconSize} />
        case 'database':
            return <Database size={iconSize} />
        case 'schema':
            return <Network size={iconSize} />
        case 'duckdb-wasm':
            return <Database size={iconSize} />
        case 'duckdb-over-http':
            return <Database size={iconSize} />
        case 'local-filesystem':
            return <File size={iconSize} />
        case 'Integer':
            return <Hash size={iconSize}/>;
        case 'Float':
            return <Hash size={iconSize}/>;
        case 'String':
            return <Text size={iconSize}/>;
        case 'Boolean':
            return <ToggleLeft size={iconSize}/>;
        case 'Timestamp':
            return <Calendar size={iconSize}/>;
        default:
            return <FileWarning size={iconSize} />
    }
}