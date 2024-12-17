import {ReactNode} from "react";
import {TaskExecutionState} from "@/model/relation-state";
import {RelationViewHeaderBorder} from "@/components/basics/basic-view/view-header-with-border";
import {H5} from "@/components/ui/typography";


export interface ViewHeaderProps {
    title: string;
    subtitle: string;
    actionButtons?: ReactNode;
    state?: TaskExecutionState;
}

export function ViewHeader({title, subtitle, actionButtons, state = {state: 'not-started'}}: ViewHeaderProps) {
    return (
        <>
            <div className="flex flex-row items-center justify-between w-full h-[48px] px-4">
                <div className="flex flex-row items-center flex-1">
                    <H5 title={title}>{title}</H5>
                    <div className="ml-4 text-sm text-gray-500">{subtitle}</div>
                </div>
                <div className="flex flex-row items-center space-x-2 justify-end">
                    {actionButtons}
                </div>
            </div>

            <RelationViewHeaderBorder state={state}/>
        </>
    )
}

