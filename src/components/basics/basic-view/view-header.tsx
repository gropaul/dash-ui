import {ReactNode} from "react";
import {TaskExecutionState} from "@/model/relation-state";
import {RelationViewHeaderBorder} from "@/components/basics/basic-view/view-header-with-border";
import {H5} from "@/components/ui/typography";
import {Label} from "@/components/ui/label";
import {RelationViewRunButton} from "@/components/relation/settings/relation-view-run-button";

export interface ViewHeaderProps {
    title: string;
    titleComponent?: ReactNode;

    subtitle?: ReactNode;
    actionButtons?: ReactNode;
    state?: TaskExecutionState;
    onRunClick?: () => void;
    onCancelClick?: () => void;
    /** Reserve the run-button slot with a spacer when no run button is shown,
     *  so the title aligns with views that do have one (e.g. relations). */
    reserveRunButtonSpace?: boolean;
    /** Custom element for the leading (run-button) slot, e.g. a "+" menu.
     *  Only used when no run button is shown; occupies the same aligned slot. */
    leadingButton?: ReactNode;

    onTitleChange?: (newTitle: string) => void;
}

export function ViewHeader({
                               title,
                               titleComponent,
                               actionButtons,
                               state,
                               onCancelClick,
                               onRunClick,
                               subtitle,
                               onTitleChange,
                               reserveRunButtonSpace,
                               leadingButton,
                           }: ViewHeaderProps) {

    return (
        <>
            <RelationViewHeaderBorder state={state ??  { state: "not-started" }}/>

            <div className="flex flex-row items-center justify-between w-full h-[48px] pl-3">
                <div className="flex flex-row items-center flex-1 gap-2  overflow-hidden">
                    {
                        state && onCancelClick && onRunClick ? (
                            <RelationViewRunButton
                                className={'rounded-sm h-10 w-10'}
                                onStopRun={onCancelClick}
                                onRun={onRunClick}
                                runState={state}
                            />
                        ) : leadingButton ? (
                            leadingButton
                        ) : reserveRunButtonSpace ? (
                            <div className="h-10 w-10 flex-shrink-0" aria-hidden="true"/>
                        ) : null
                    }
                    {/* Title (shrinks, ellipsizes) */}
                    {titleComponent ? (
                        titleComponent
                    ) : (
                        <H5
                            className="text-ellipsis whitespace-nowrap flex-shrink min-w-0"
                        >
                            
                        </H5>
                    )}

                    {/* Subtitle (fixed width, always visible, never shrinks) */}
                    {subtitle && (
                        <Label className="pl-2 text-xs whitespace-nowrap flex-shrink-0">
                            {subtitle}
                        </Label>
                    )}
                </div>

                <div className="flex flex-row items-center space-x-2 justify-end h-full pt-2 pb-2">
                    {actionButtons}
                </div>
            </div>

        </>
    );
}
