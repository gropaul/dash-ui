import {DirectoryDisplayChild} from "@/components/directory/directory-display-child";
import {Button} from "@/components/ui/button";
import {ArrowLeft, Search} from "lucide-react";
import {H5} from "@/components/ui/typography";
import {Separator} from "@/components/ui/separator";
import {DirectoryItem} from "@/components/export/hostfs-functions";
import {useState} from "react";
import {InputWithIcon} from "@/components/ui/input-with-icon";


export type DirectoryDisplayMode = 'grid' | 'list';

export interface DirectoryDisplaySettings {
    displayMode: DirectoryDisplayMode;
    onlyShowFolders: boolean;
}

export interface DirectoryDisplayContent {
    dirPath: string;
    content: DirectoryItem[]
}

export interface DirectoryDisplayProps extends DirectoryDisplayContent {
    displaySettings: DirectoryDisplaySettings;
    onItemClick?: (path: DirectoryItem) => void;
    backDisabled?: boolean;
    onBackClick?: () => void;
}


function filterItems(items: DirectoryItem[], searchText: string): DirectoryItem[] {

    // if the search text is empty, return all items
    if (searchText === '') {
        return items;
    }

    return items.filter((item) => item.name.toLowerCase().includes(searchText.toLowerCase()));
}

export function DirectoryDisplay({
                                     dirPath,
                                     content,
                                     onItemClick,
                                     onBackClick,
                                     backDisabled,
                                     displaySettings
                                 }: DirectoryDisplayProps) {

    const wrapperClass = displaySettings.displayMode === 'grid' ?
        'flex flex-row flex-wrap items-stretch w-full'
        :
        'flex flex-col space-y-4';

    const [searchText, setSearchText] = useState<string>('');

    return (
        <>
            <div className="flex flex-row items-center space-x-2 ">
                <Button
                    disabled={backDisabled}
                    size={'icon'}
                    variant={'ghost'}
                    onClick={onBackClick}
                >
                    <ArrowLeft size={10}/>
                </Button>
                <H5 className="text-primary">{dirPath}</H5>
                <div className="flex-1"/>
                { /* Search bar goes here */}
                <div className={'max-w-48'}>
                    <InputWithIcon
                        startIcon={Search}
                        placeholder={'Search...'}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                </div>
            </div>
            <Separator/>
            <div className={'overflow-auto'}>
                <div className={`flex ${wrapperClass}`}>
                    {filterItems(content, searchText).map((item, index) => (
                        <>
                            {(!displaySettings.onlyShowFolders || item.type === 'directory') &&
                                <DirectoryDisplayChild
                                    key={index}
                                    item={item}
                                    displayMode={'grid'}
                                    onClick={() => onItemClick?.(item)}
                                />
                            }
                        </>
                    ))}
                </div>
            </div>
        </>
    )
}