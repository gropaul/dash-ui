import {ReactNode} from "react";
import {TaskExecutionState} from "@/model/relation-state";
import {RelationViewHeaderBorder} from "@/components/basics/basic-view/view-header-with-border";
import {H5} from "@/components/ui/typography";
import {ViewPathBreadcrumb} from "@/components/basics/basic-view/view-path-breadcrumb";
import {EditableTextBase} from "@/components/basics/input/editable-text-base";
import {useIsMobile} from "@/components/provider/responsive-node-provider";

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

    const isMobile = useIsMobile();

    return (
        <>
            <div className="flex flex-row items-center justify-between w-full h-[48px] pl-4 pr-2">
                <div className="flex flex-row items-center flex-1 gap-4 overflow-hidden pr-2">
                    {/* Title (shrinks, ellipsizes) */}
                    <H5
                        className="text-primary overflow-hidden text-ellipsis whitespace-nowrap flex-shrink min-w-0"
                    >
                        {title}
                    </H5>

                    {/* Breadcrumb (also shrinks, ellipsizes) */}
                    {!isMobile && (
                        <div className="overflow-hidden text-ellipsis whitespace-nowrap flex-shrink min-w-0">
                            <ViewPathBreadcrumb path={path} onClick={onPathClick} />
                        </div>
                    )}

                    {/* Subtitle (fixed width, always visible, never shrinks) */}
                    {subtitle && (
                        <div className="whitespace-nowrap flex-shrink-0">
                            <EditableTextBase text={subtitle} onTextChange={onSubtitleChange} />
                        </div>
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
