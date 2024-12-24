import {DataSourceGroup} from "@/model/connection";
import {DirectoryDisplayMode} from "@/components/directory/directory-view";


// using Omit to remove the children property from DirectoryNormalized
export interface DirectoryNormalizedChild {
    id: string;
    name: string;
    type: 'file' | 'folder';
}

export interface DirectoryNormalized {
    id: string;
    path: string[];
    name: string;
    children: DirectoryNormalizedChild[];
}

export interface DirectoryNormalizedState {
    dir: DirectoryNormalized;
    displayMode: DirectoryDisplayMode;
}

export function getIdFromPath(connection: string, path: string[]): string {
    return `${connection}-${path.join('-')}`;
}

/// DataSourceGroup needs to have the children property initialized
export function normalizeDirectory(connectionId: string, path: string[], dataSource: DataSourceGroup): DirectoryNormalizedState {
    const id = getIdFromPath(connectionId, path);
    const name = dataSource.name;

    // assert if children is undefined
    if (!dataSource.children) {
        throw new Error('Children is undefined');
    }

    const children: DirectoryNormalizedChild[] | undefined = dataSource.children.map((child) => {

        if (child.type !== 'file' && child.type !== 'folder') {
            throw new Error(`Unknown child type: ${child.type}`);
        }

        return {
            id: getIdFromPath(connectionId, [...path, child.id]),
            path: [...path, child.id],
            name: child.name,
            type: child.type,
        }
    });

    return {
        dir: {
            id,
            path,
            name,
            children: children!,
        },
        displayMode: 'grid',
    };
}