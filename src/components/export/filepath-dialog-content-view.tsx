import React, {useEffect} from "react";
import {DirectoryDisplay, DirectoryDisplayContent} from "@/components/directory/directory-display";
import {
    concatPaths,
    DirectoryItem,
    getCurrentWorkingDirectory,
    getDirectoryContent,
    getParentPath,
    splitPath
} from "@/components/export/hostfs-functions";
import {Separator} from "@/components/ui/separator";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {FilepathDialogProps} from "@/components/export/filepath-dialog";


export interface FilepathDialogContentViewProps extends FilepathDialogProps {
    dialogTriggerRef: React.RefObject<HTMLButtonElement>;
}

export interface FilepathDisplayContent extends DirectoryDisplayContent {
    filePath: string;
}

export function FilepathDialogContentView(props: FilepathDialogContentViewProps) {

    const [directoryContent, setDirectoryContent] = React.useState<FilepathDisplayContent | undefined>(undefined);

    async function setContentOfPath(path: string, filePath?: string) {
        const newContent = await getDirectoryContent(path, 'lastModified');

        const fileName = 'export.' + props.fileFormat;
        const filePathNotNull = filePath ?? concatPaths(path, fileName);
        setDirectoryContent({
            dirPath: path,
            content: newContent,
            filePath: filePathNotNull
        });
    }

    // get the initial directory from the connection
    useEffect(() => {

        async function getPath() {
            if (props.basePath) {
                return props.basePath;
            } else {
                return await getCurrentWorkingDirectory();
            }
        }

        getPath().then((path) => {
            setContentOfPath(path);
        });

    }, []);

    if (!directoryContent) {
        return <div>Loading...</div>;
    }

    async function onBackClick() {
        if (!currentPath) {
            return;
        }

        const parentPath = getParentPath(currentPath);
        setContentOfPath(parentPath);
    }


    async function onChildClick(item: DirectoryItem) {
        if (item.type == 'directory') {
            setContentOfPath(item.path);
        } else {
            onFilePathChanged(item.path);
        }

    }

    async function onFilePathChanged(path: string) {
        const parentPath = getParentPath(path);
        setContentOfPath(parentPath, path);
    }

    async function onSaveClick() {

        if (!directoryContent) {
            return;
        }

        // save the file
        props.dialogTriggerRef.current?.click();
        props.onFilePathSelected?.(directoryContent?.filePath);
    }

    const currentPath = directoryContent?.dirPath;
    const pathSplit = splitPath(currentPath);
    const backDisabled = pathSplit.length === 0;


    return (

        <div className={'h-full w-full flex flex-col space-y-2'}>
            <DirectoryDisplay
                backDisabled={backDisabled}
                onBackClick={onBackClick}
                onItemClick={onChildClick}
                displaySettings={{
                    displayMode: 'grid',
                    onlyShowFolders: false
                }}
                {...directoryContent}
            />
            <div className={'flex-1'}/>
            <Separator/>
            <div className={'w-full h-8 flex flex-row content-center items-center space-x-2'}>
                    <span className={'text-muted-foreground text-sm text-nowrap'}>
                        Save file to:
                    </span>
                <Input
                    className={'flex-1'}
                    value={directoryContent.filePath}
                    onChange={(e) => onFilePathChanged(e.target.value)}
                />
                <Button type="submit" onClick={onSaveClick}>Save</Button>
            </div>

        </div>

    )
}
