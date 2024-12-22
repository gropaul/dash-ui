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
            <div className="flex flex-row items-center justify-between w-full h-[48px] pl-4 pr-2">
                <div className="flex flex-row items-center flex-1">
                    <H5 className={'text-primary'} title={title}>{title}</H5>
                    <div className="ml-4 text-sm text-muted-foreground">{subtitle}</div>
                </div>
                <div className="flex flex-row items-center space-x-2 justify-end h-full pt-2 pb-2">
                    {actionButtons}
                </div>
            </div>

            <RelationViewHeaderBorder state={state}/>
        </>
    )
}

