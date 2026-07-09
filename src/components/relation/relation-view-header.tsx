import {Braces, ChartSpline, Code, LayoutDashboard, Map, Menu, Sheet} from "lucide-react";
import {ViewHeader} from "@/components/basics/basic-view/view-header";
import {RelationViewType} from "@/model/relation-view-state";
import {Toggle} from "@/components/ui/toggle"
import {Separator} from "@/components/ui/separator";
import {getPathFromRelation} from "@/model/relation";
import {HeaderDownloadButton, HeaderDownloadButtonContent} from "@/components/relation/header/header-download-button";
import {useIsMobile} from "@/components/provider/responsive-node-provider";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
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
import {WorkspacePathPrefix} from "@/components/spaces/workspace-path";

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
    const {source, connectionId, viewState} = props.relationState;

    const codeFenceState = props.getSessionState(props.mode).codeFenceState;
    const parametersState = viewState.parametersState ?? {
        panelState: {show: false, sizePercentage: 30},
        parameters: []
    };


    const isMobile = useIsMobile();

    const path = getPathFromRelation(source, connectionId);

    const mapDisabled = true;

    const queryToggleText = codeFenceState.show ? 'Hide Query' : 'Show Query';
    const parametersToggleText = parametersState.panelState.show ? 'Hide Parameters' : 'Show Parameters';

    const [filepathDialogState, setFilepathDialogState] = useState<FilepathDialogState>({
        open: false,
        fileFormat: 'csv',
        relationId: relationId
    });


    const {breadcrumbPrefix} = inputProps;

    const titleComponent = (
        <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
            {breadcrumbPrefix ? (
                <>
                    <button
                        onClick={breadcrumbPrefix.onClick}
                        className="text-muted-foreground hover:text-foreground whitespace-nowrap flex-shrink-0 text-sm font-medium"
                    >
                        {breadcrumbPrefix.label}
                    </button>
                    <span className="text-muted-foreground flex-shrink-0">/</span>
                </>
            ) : (
                <WorkspacePathPrefix entityId={relationId}/>
            )}
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
                path={path}
                state={props.relationState.executionState}
                onRunClick={() => props.updateRelationDataWithBaseQuery(props.relationState.query.baseQuery)}
                onCancelClick={props.cancelQuery}
                actionButtons={
                    isMobile ?
                        <>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <Menu/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>

                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>Export as ...</DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                            <DropdownMenuSubContent>
                                                <HeaderDownloadButtonContent
                                                    state={filepathDialogState}
                                                    setState={setFilepathDialogState}
                                                />
                                            </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                    <DropdownMenuItem
                                        onClick={() => advancedActions.updateSessionState(props.mode, {codeFenceState: {show: !codeFenceState.show}})}
                                        title={queryToggleText}
                                    >
                                        <span>{queryToggleText}</span>
                                    </DropdownMenuItem>
                                    {parametersState.parameters.length != 0 &&
                                        <DropdownMenuItem
                                            onClick={props.toggleShowParameters}
                                            title={parametersToggleText}
                                        >
                                            <span>{parametersToggleText}</span>
                                        </DropdownMenuItem>
                                    }
                                    <DropdownMenuSeparator/>

                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                        :
                        <>
                            {
                                parametersState.parameters.length != 0 && <Toggle
                                    onClick={props.toggleShowParameters}
                                    pressed={parametersState.panelState.show}
                                    title={parametersToggleText}
                                >
                                    <Braces className="h-4 w-4"/>
                                </Toggle>
                            }
                            <RelationSettings {...props} align={"end"}>
                                <DropdownMenuItem
                                    onClick={() => advancedActions.updateSessionState(props.mode, {codeFenceState: {show: !codeFenceState.show}})}
                                >
                                    <Code size={16} className="mr-1"/>
                                    {queryToggleText}
                                </DropdownMenuItem>
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
