import {ReactNode, useState, useRef, useEffect} from "react";
import { TaskExecutionState } from "@/model/relation-state";
import { RelationViewHeaderBorder } from "@/components/basics/basic-view/view-header-with-border";
import { H5 } from "@/components/ui/typography";
import { ViewPathBreadcrumb } from "@/components/basics/basic-view/view-path-breadcrumb";

export interface ViewHeaderProps {
    title: string;
    path: string[];
    onPathClick?: (element: string, index: number) => void;

    subtitle?: string;
    actionButtons?: ReactNode;
    state?: TaskExecutionState;

    onTitleChange?: (newTitle: string) => void;
    onSubtitleChange?: (newSubtitle: string) => void;
}

export function ViewHeader({
                               title,
                               path,
                               actionButtons,
                               state = { state: "not-started" },
                               subtitle,
                               onPathClick,
                               onTitleChange,
                               onSubtitleChange,
                           }: ViewHeaderProps) {
    const [editableTitle, setEditableTitle] = useState(title);
    const [editableSubtitle, setEditableSubtitle] = useState(subtitle);
    const titleRef = useRef<HTMLSpanElement>(null);
    const subtitleRef = useRef<HTMLSpanElement>(null);

    // listen for changes to the title and subtitle
    useEffect(() => {
        setEditableTitle(title);
    } , [title]);
    useEffect(() => {
        setEditableSubtitle(subtitle);
    }, [subtitle]);

    const handleInput = (event: React.FormEvent<HTMLSpanElement>) => {
        if (onTitleChange) {
            onTitleChange(event.currentTarget.innerText);
        }
    };

    return (
        <>
            <div className="flex flex-row items-center justify-between w-full h-[48px] pl-4 pr-2">
                <div className="flex flex-row items-center flex-1 gap-4">
                    <H5
                        className="text-primary overflow-hidden text-ellipsis whitespace-nowrap max-w-[60%]"
                        title={editableTitle} // Tooltip for full text on hover
                    >
                        <span
                            ref={titleRef}
                            onInput={handleInput}
                            contentEditable={!!onTitleChange}
                            suppressContentEditableWarning
                            className="outline-none"
                        >
                            {editableTitle}
                        </span>
                    </H5>

                    <ViewPathBreadcrumb path={path} onClick={onPathClick} />

                    {subtitle && (
                        <span
                            ref={subtitleRef}
                            contentEditable={!!onSubtitleChange}
                            suppressContentEditableWarning
                            className="text-sm text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap max-w-[50%] outline-none"
                        >
                            {editableSubtitle}
                        </span>
                    )}
                </div>
                <div className="flex flex-row items-center space-x-2 justify-end h-full pt-2 pb-2">
                    {actionButtons}
                </div>
            </div>

            <RelationViewHeaderBorder state={state} />
        </>
    );
}
