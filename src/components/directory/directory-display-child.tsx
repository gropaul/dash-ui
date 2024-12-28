import {File, Folder} from "lucide-react";
import {DirectoryItem} from "@/components/export/hostfs-functions";
import {DirectoryDisplayMode} from "@/components/directory/directory-display";

export interface DirectoryChildViewProps {
    item: DirectoryItem;
    displayMode: DirectoryDisplayMode;
    onClick?: () => void;
}

export function DirectoryDisplayChild({item, displayMode, onClick}: DirectoryChildViewProps) {
    const isFolder = item.type === 'directory';

    const iconSize = displayMode === 'list' ? 16 : 32;

    // Common icon and name component
    const renderItem = (
        <>
            {isFolder ? <Folder size={iconSize}/> : <File size={iconSize}/>}
            <div
                title={item.name}
                className="text-sm font-medium text-center text-muted-foreground w-24 break-words line-clamp-2 text-ellipsis">
                {item.name}
            </div>
        </>
    );

    return (
        <div
            onClick={onClick}
            className={
                displayMode === 'list'
                    ? "flex flex-row items-center space-x-4 p-2 cursor-pointer hover:bg-muted"
                    : "flex flex-col items-center space-y-2 mr-2 mb-2 py-0.5 cursor-pointer w-30 h-30 hover:bg-muted rounded"
            }
        >
            {renderItem}
        </div>
    );
}
