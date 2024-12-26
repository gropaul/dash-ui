import {ReactNode} from "react";
import {TaskExecutionState} from "@/model/relation-state";
import {RelationViewHeaderBorder} from "@/components/basics/basic-view/view-header-with-border";
import {H5} from "@/components/ui/typography";
import {ViewPathBreadcrumb} from "@/components/basics/basic-view/view-path-breadcrumb";


export interface ViewHeaderProps {
    title: string;
    path: string[]
    onPathClick?: (element: string, index: number) => void

    subtitle?: string;
    actionButtons?: ReactNode;
    state?: TaskExecutionState;
}

export function ViewHeader({title, path, actionButtons, state = {state: 'not-started'}, subtitle, onPathClick}: ViewHeaderProps) {
    return (
        <>
            <div className="flex flex-row items-center justify-between w-full h-[48px] pl-4 pr-2">
                <div className="flex flex-row items-center flex-1 gap-4">
                    <H5
                        className="text-primary overflow-hidden text-ellipsis whitespace-nowrap max-w-[60%]"
                        title={title} // Tooltip for full text on hover
                    >
                        {title}
                    </H5>

                    <ViewPathBreadcrumb
                        path={path}
                        onClick={onPathClick}
                    />
                    <div>
                        {subtitle && <span
                            className="text-sm text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap max-w-[50%]"
                        >{subtitle}</span>}
                    </div>
                </div>
                <div className="flex flex-row items-center space-x-2 justify-end h-full pt-2 pb-2">
                    {actionButtons}
                </div>
            </div>

            <RelationViewHeaderBorder state={state}/>
        </>
    )
}

