import {DirectoryNormalizedState} from "@/model/directory-normalized";
import {DirectoryDisplayChild} from "@/components/directory/directory-display-child";
import {Button} from "@/components/ui/button";
import {ArrowLeft} from "lucide-react";
import {H5} from "@/components/ui/typography";
import {Separator} from "@/components/ui/separator";


export interface DirectoryDisplayProps {
    className?: string;
    directory: DirectoryNormalizedState;
    onChildClick?: (path: string[]) => void;
}

export function DirectoryDisplay({directory, onChildClick, className}: DirectoryDisplayProps) {

    const wrapperClass = directory.displayMode === 'grid' ?
        'flex flex-row flex-wrap items-start w-full h-full align-start content-start'
        :
        'flex flex-col space-y-4';

    return (
        <div className={'flex-1 w-full h-full flex flex-col space-y-4 align-start content-start' + ' ' + className}>
            <div className="flex flex-row items-center space-x-2">
                <Button
                    disabled={directory.dir.path.length === 1}
                    size={'icon'}
                    variant={'ghost'}
                    onClick={() => {
                        // Go back to parent directory
                        onChildClick?.(directory.dir.path.slice(0, -1))
                    }}
                >
                    <ArrowLeft size={10}/>
                </Button>
                <H5 className="text-primary">{directory.dir.name}</H5>
            </div>
            <Separator/>
            <div className={`flex-1 flex overflow-auto w-full h-full ${wrapperClass}`}>
                {directory.dir.children!.map((child, index) => (
                    <>
                        {!directory.onlyShowFolders || child.type === 'folder' && <DirectoryDisplayChild
                            key={index}
                            child={child}
                            displayMode={'grid'}
                            onClick={() => onChildClick?.(child.path)}
                        />}
                    </>
                ))}
            </div>
        </div>
    )
}