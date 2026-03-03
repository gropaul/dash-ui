import {ReactNode} from "react";
import {TaskExecutionState} from "@/model/relation-state";
import {RelationViewHeaderBorder} from "@/components/basics/basic-view/view-header-with-border";
import {H5} from "@/components/ui/typography";
import {ViewPathBreadcrumb} from "@/components/basics/basic-view/view-path-breadcrumb";
import {useIsMobile} from "@/components/provider/responsive-node-provider";
import {RelationViewRunButton} from "@/components/relation/settings/relation-view-run-button";

export interface ViewHeaderProps {
    title: string;
    path: string[];
    onPathClick?: (element: string, index: number) => void;

    subtitle?: ReactNode;
    actionButtons?: ReactNode;
    state?: TaskExecutionState;
    onRunClick?: () => void;
    onCancelClick?: () => void;

    onTitleChange?: (newTitle: string) => void;
}

export function ViewHeader({
                               title,
                               path,
                               actionButtons,
                               state,
                               onCancelClick,
                               onRunClick,
                               subtitle,
                               onPathClick,
                               onTitleChange,
                           }: ViewHeaderProps) {

    const isMobile = useIsMobile();

    return (
        <>
            <div className="flex flex-row items-center justify-between w-full h-[48px] pl-3 pr-2">
                <div className="flex flex-row items-center flex-1 gap-2  overflow-hidden pr-2">
                    {
                        state && onCancelClick && onRunClick && <RelationViewRunButton
                            className={'rounded-sm h-10 w-10'}
                            onStopRun={onCancelClick}
                            onRun={onRunClick}
                            runState={state}
                        />
                    }
                    {/* Title (shrinks, ellipsizes) */}
                    <H5
                        className="text-primary overflow-hidden text-ellipsis whitespace-nowrap flex-shrink min-w-0"
                    >
                        {title}
                    </H5>

                    {/* Breadcrumb (also shrinks, ellipsizes) */}
                    {!isMobile && (
                        <div className="pl-2 overflow-hidden text-ellipsis whitespace-nowrap flex-shrink min-w-0">
                            <ViewPathBreadcrumb path={path} onClick={onPathClick}/>
                        </div>
                    )}

                    {/* Subtitle (fixed width, always visible, never shrinks) */}
                    {subtitle && (
                        <div className="pl-2 whitespace-nowrap flex-shrink-0">
                            {subtitle}
                        </div>
                    )}
                </div>

                <div className="flex flex-row items-center space-x-2 justify-end h-full pt-2 pb-2">
                    {actionButtons}
                </div>
            </div>

            <RelationViewHeaderBorder state={state ??  { state: "not-started" }}/>
        </>
    );
}
