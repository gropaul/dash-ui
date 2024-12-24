import {useRelationsState} from "@/state/relations.state";
import {ViewHeader} from "@/components/basics/basic-view/view-header";
import {DirectoryChildView} from "@/components/directory/directory-child-view";


export type DirectoryDisplayMode = 'grid' | 'list';

interface DirectoryViewProps {
    directoryId: string;
}

export function DirectoryView(props: DirectoryViewProps) {

    const directoryState = useRelationsState((state) => state.directories[props.directoryId]);

    const directory = directoryState.dir;

    const wrapperClass = directoryState.displayMode === 'grid' ?
        'flex flex-row flex-wrap items-start w-full h-full align-start content-start'
        :
        'flex flex-col space-y-4';

    return (
        <div className="w-full h-full flex flex-col">
            <ViewHeader title={directory.name} path={directory.path}/>
            <div className={`p-4 flex overflow-auto w-full h-full ${wrapperClass}`}>
                {directory.children!.map((child, index) => (
                    <DirectoryChildView
                        key={index}
                        child={child}
                        displayMode={'grid'}
                    />
                ))}
            </div>
        </div>
    )
}
