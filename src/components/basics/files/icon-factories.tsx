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
    Network, Settings2,
    Sheet, Sliders, SlidersHorizontal,
    SquareChevronDown,
    Table2,
    Text,
    ToggleLeft, Type,
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
    slider: { background: 'rgba(234, 179, 8, 0.1)', foreground: '#eab308' },
    table: { background: 'rgba(139, 92, 246, 0.1)', foreground: '#8b5cf6' },  // purple
    chart: { background: 'rgba(59, 130, 246, 0.1)', foreground: '#3b82f6' },  // blue
    map: { background: 'rgba(34, 197, 94, 0.1)', foreground: '#22c55e' },     // green
    select: { background: 'rgba(249, 115, 22, 0.1)', foreground: '#f97316' }, // orange
    text: { background: 'rgba(236, 72, 153, 0.1)', foreground: '#ec4899' },   // pink
};

export const defaultColorFactory = (type: RelationViewType): ViewTypeColor => {
    return relationViewTypeColors[type] ?? relationViewTypeColors.table;
};

// Colors for the workspace entity/group types (folder, relations, dashboards, canvas, …), used by
// the folder view's colored icons. Relations are usually colored by their view type instead (see
// colorForType), so this `relations` entry is only the fallback when the view type is unknown.
const entityTypeColors: Record<string, ViewTypeColor> = {
    folder:     { background: 'rgba(100, 116, 139, 0.1)', foreground: '#64748b' }, // slate
    relations:  relationViewTypeColors.table,                                      // purple
    dashboards: { background: 'rgba(99, 102, 241, 0.1)',  foreground: '#6366f1' }, // indigo
    canvas:     { background: 'rgba(20, 184, 166, 0.1)',  foreground: '#14b8a6' }, // teal
    databases:  { background: 'rgba(14, 165, 233, 0.1)',  foreground: '#0ea5e9' }, // sky
    schemas:    { background: 'rgba(34, 197, 94, 0.1)',   foreground: '#22c55e' }, // green
};

// Color for any icon type — a relation view type (table/chart/…) or an entity type
// (folder/dashboards/canvas/…). Falls back to the table (purple) color.
export const colorForType = (type: string): ViewTypeColor =>
    relationViewTypeColors[type as RelationViewType] ?? entityTypeColors[type] ?? relationViewTypeColors.table;

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
        case 'text':
            return <Type size={iconSize}/>
        case 'slider':
            return <Settings2 size={iconSize}/>
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
        case 'canvas':
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

// A colorful, tinted rounded icon box — the same treatment the canvas relation nodes use
// (see relation-header.tsx). `type` is an icon type: a relation view type (table/chart/…) or an
// entity type (folder/dashboards/canvas/…), which drives both the icon and the color.
// `background = false` drops the tinted box, keeping just the colored icon (e.g. inline in menus).
export function ColoredIcon({type, size = 28, background = true}: {type: string; size?: number; background?: boolean}): ReactNode {
    const color = colorForType(type);
    return (
        <div
            style={{
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: background ? color.background : 'transparent',
                color: color.foreground,
            }}
        >
            {defaultIconFactory(type)}
        </div>
    );
}