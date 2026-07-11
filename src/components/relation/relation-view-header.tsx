import {Braces, ChartSpline, Code, LayoutDashboard, Map, Maximize2, Menu, Sheet} from "lucide-react";
import {ViewHeader} from "@/components/basics/basic-view/view-header";
import {RelationViewType} from "@/model/relation-view-state";
import {Toggle} from "@/components/ui/toggle"
import {Separator} from "@/components/ui/separator";
import {HeaderDownloadButton, HeaderDownloadButtonContent} from "@/components/relation/header/header-download-button";
import {useIsMobile} from "@/components/provider/responsive-node-provider";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuSwitchItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import React, {useState} from "react";
import {FilepathDialog, FilepathDialogState} from "@/components/export/filepath-dialog";
import {RelationViewAPIProps, RelationViewProps} from "@/components/relation/relation-view";
import {RelationSettings} from "@/components/relation/relation-settings";
import {RelationViewTypeSwitcher, ViewSwitchEntry} from "@/components/relation/settings/relation-view-type-switcher";
import {RelationTitleWithActions} from "@/components/relation/common/relation-title-with-actions";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";

export interface RelationViewHeaderProps extends RelationViewAPIProps {
    children?: React.ReactNode;
}

export function RelationViewHeader(inputProps: RelationViewHeaderProps) {


    const advancedActions = getRelationActions(inputProps)
    const props: RelationViewProps = {
        ...inputProps,
        ...advancedActions,
    };

    const relationId = props.relationState.id;
    const {viewState} = props.relationState;


    const codeFenceState = props.getSessionState(props.mode).codeFenceState;
    const queryToggleText = codeFenceState.show ? 'Hide Query' : 'Show Query';
    const parametersState = viewState.parametersState ?? {
        panelState: {show: false, sizePercentage: 30},
        parameters: []
    };


    const isMobile = useIsMobile();


    const parametersToggleText = parametersState.panelState.show ? 'Hide Parameters' : 'Show Parameters';

    const [filepathDialogState, setFilepathDialogState] = useState<FilepathDialogState>({
        open: false,
        fileFormat: 'csv',
        relationId: relationId
    });

    const titleComponent = (
        <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
            <RelationTitleWithActions
                relationState={inputProps.relationState}
                executionInfoClassName="text-xs"
            />
        </div>
    );

    return (
        <>
            <ViewHeader
                title={viewState.displayName}
                titleComponent={titleComponent}
                state={props.relationState.executionState}
                onRunClick={() => props.updateRelationDataWithBaseQuery(props.relationState.query.baseQuery)}
                onCancelClick={props.cancelQuery}
                actionButtons={
                    isMobile ?
                        <>
                        </>
                        :
                        <>
                            {
                                parametersState.parameters.length != 0 && <Toggle
                                    onClick={props.toggleShowParameters}
                                    pressed={parametersState.panelState.show}
                                    title={parametersToggleText}
                                >
                                    <Braces className="h-4 w-4 mr-2 "/>
                                </Toggle>
                            }
                            <RelationSettings {...props} align={"end"}>
                                <DropdownMenuSwitchItem
                                    title={queryToggleText}
                                    checked={codeFenceState.show}
                                    onCheckedChange={(show) => advancedActions.updateSessionState(props.mode, {codeFenceState: {show}})}
                                    icon={<Code className="h-4 w-4 mr-2 "/>}
                                >
                                    Show Query
                                </DropdownMenuSwitchItem>
                            </RelationSettings>
                            <div className="w-1"/>
                        </>
                }
            />
            <FilepathDialog
                state={filepathDialogState}
                setState={setFilepathDialogState}
            />
        </>
    );
}
