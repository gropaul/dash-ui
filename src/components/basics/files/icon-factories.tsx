import React, {ReactNode} from "react";
import {
    BarChart3,
    Braces,
    Calendar, ChartArea, ChartBarBig, ChartColumnBig,
    Database,
    File,
    Folder,
    Hash,
    LayoutDashboard,
    LoaderCircle,
    Map,
    Network,
    Sheet,
    SquareChevronDown,
    Table2,
    Text,
    ToggleLeft,
    View,
    WorkflowIcon
} from "lucide-react";
import {ValueIcon} from "@/components/relation/common/value-icon";
import {RelationViewType} from "@/model/relation-view-state";


export type DBConnectionType = 'duckdb-wasm' | 'duckdb-wasm-motherduck' | 'duckdb-over-http';
export type DataSourceType = 'file' | 'relation';
export type DataGroupType = 'folder' | 'database';

export type PossibleIconTypes = DataSourceType | DataGroupType | DBConnectionType;

export interface ViewTypeColor {
    background: string;
    foreground: string;
}

const relationViewTypeColors: Record<RelationViewType, ViewTypeColor> = {
    table: { background: 'rgba(139, 92, 246, 0.1)', foreground: '#8b5cf6' },  // purple
    chart: { background: 'rgba(59, 130, 246, 0.1)', foreground: '#3b82f6' },  // blue
    map: { background: 'rgba(34, 197, 94, 0.1)', foreground: '#22c55e' },     // green
    select: { background: 'rgba(249, 115, 22, 0.1)', foreground: '#f97316' }, // orange
};

export const defaultColorFactory = (type: RelationViewType): ViewTypeColor => {
    return relationViewTypeColors[type] ?? relationViewTypeColors.table;
};

const relationViewTypeIconFactory = (type: RelationViewType): ReactNode | null => {
    const iconSize = 16;

    switch (type) {
        case 'map':
            return <Map size={iconSize} />
        case 'chart':
            return <ChartColumnBig size={iconSize} />
        case 'table':
            return <Sheet size={iconSize} />
        case 'select':
            return <SquareChevronDown size={iconSize}/>
    }
    return null;
}

export const defaultIconFactory = (type: string): ReactNode => {
    const iconSize = 16;

    const relationIcon = relationViewTypeIconFactory(type as RelationViewType);
    if (relationIcon) {
        return relationIcon;
    }

    switch (type) {
        case 'loading':
            return <LoaderCircle size={iconSize} />
        case 'file':
            return <File size={iconSize} />
        case 'relation':
        case 'relations':
            return <Sheet size={iconSize} />
        case 'view':
            return <View size={iconSize} />
        case 'folder':
            return <Folder size={iconSize} />
        case 'database':
        case 'databases':
            return <Database size={iconSize} />
        case 'dashboard':
        case 'dashboards':
            return <LayoutDashboard size={iconSize} />
        case 'workflow':
        case 'workflows':
            return <WorkflowIcon size={iconSize} />
        case 'schema':
        case 'schemas':
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
        case 'Map':
        case 'Struct':
            return <Braces size={iconSize}/>;
        default:
            return ValueIcon({type: type as any, size: iconSize});
    }
}