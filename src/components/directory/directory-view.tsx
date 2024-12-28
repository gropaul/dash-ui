import {useRelationsState} from "@/state/relations.state";
import {ViewHeader} from "@/components/basics/basic-view/view-header";


export type DirectoryDisplayMode = 'grid' | 'list';

interface DirectoryViewProps {
    directoryId: string;
}

export function DirectoryView(props: DirectoryViewProps) {

    const directoryState = useRelationsState((state) => state.directories[props.directoryId]);

    const directory = directoryState.dir;



    return (
        <div className="w-full h-full flex flex-col">
            <ViewHeader title={directory.name} path={directory.path}/>

        </div>
    )
}
