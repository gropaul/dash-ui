import {Dialog, DialogContent, DialogHeader, DialogTrigger,} from "@/components/ui/dialog"
import React, {useEffect} from "react";
import {ConnectionsService} from "@/state/connections/connections-service";
import {DataSourceGroup} from "@/model/connection";
import {useConnectionsState} from "@/state/connections.state";
import {DirectoryDisplay} from "@/components/directory/directory-display";
import {CONNECTION_ID_FILE_SYSTEM_OVER_DUCKDB} from "@/platform/global-data";
import {DirectoryNormalizedState, normalizeDirectory} from "@/model/directory-normalized";
import {findNodeInTrees} from "@/components/basics/files/tree-utils";


export interface FilepathDialogProps {
    children: React.ReactNode;
    connectionId: string;
}

export function FilepathDialog(props: FilepathDialogProps) {


    const loadChildrenForDataSource = useConnectionsState((state) => state.loadChildrenForDataSource);
    const [directory, setDirectory] = React.useState<DirectoryNormalizedState | undefined>(undefined);

    function normalize(directory: DataSourceGroup, path: string[]): DirectoryNormalizedState {
        return normalizeDirectory(
            props.connectionId, path, directory as DataSourceGroup, {displayMode: 'grid', onlyShowFolders: true}
        );
    }

    // get the initial directory from the connection
    useEffect(() => {
        const initialDirectory = ConnectionsService.getInstance().getConnection(CONNECTION_ID_FILE_SYSTEM_OVER_DUCKDB).dataSources[0];
        setDirectory(normalize(initialDirectory as DataSourceGroup, [initialDirectory.id]));
    }, [props.connectionId]);

    if (!directory) {
        return <div>Loading...</div>;
    }


    async function onChildClick(path: string[]) {
        const sources = ConnectionsService.getInstance().getConnection(CONNECTION_ID_FILE_SYSTEM_OVER_DUCKDB).dataSources;
        const dataSource = findNodeInTrees(sources, path);
        if (!dataSource) {
            throw new Error('Data source not found');
        }
        await loadChildrenForDataSource(props.connectionId, path).then(
            (newDataSource) => {
                if (newDataSource) {
                    setDirectory(normalize(newDataSource, path));
                }
            }
        );
    }

    return (
        <Dialog>
            <DialogTrigger>
                {props.children}
            </DialogTrigger>
            <DialogContent className={'max-h-[90vh] max-w-[90vw] h-[60vh] w-[60vw] overflow-auto'}>
                <DialogHeader>
                    <DirectoryDisplay className='pt-4' directory={directory} onChildClick={onChildClick}/>
                </DialogHeader>

            </DialogContent>
        </Dialog>
    )
}
