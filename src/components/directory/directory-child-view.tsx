import {DirectoryNormalizedChild} from "@/model/directory-normalized";
import {Folder, File} from "lucide-react";
import {DirectoryDisplayMode} from "@/components/directory/directory-view";

export interface DirectoryChildViewProps {
    child: DirectoryNormalizedChild;
    displayMode: DirectoryDisplayMode;
}

export function DirectoryChildView({child, displayMode}: DirectoryChildViewProps) {
    const isFolder = child.type === 'folder';

    const iconSize = displayMode === 'list' ? 16 : 40;

    // Common icon and name component
    const renderItem = (
        <>
            {isFolder ? <Folder size={iconSize} /> : <File size={iconSize}/>}
            <div className="text-sm font-medium text-center text-muted-foreground w-24 break-words line-clamp-2 text-ellipsis">
                {child.name}
            </div>
        </>
    );

    return (
        <div className={
            displayMode === 'list'
                ? "flex flex-row items-center space-x-4 p-2 cursor-pointer"
                : "flex flex-col items-center space-y-2 p-4 cursor-pointer w-30 h-30"
        }>
            {renderItem}
        </div>
    );
}
