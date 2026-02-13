import {ChartSpline, Code, Map, Menu, Sheet} from "lucide-react";
import {DeepPartial, formatDuration} from "@/platform/object-utils";
import {ViewHeader} from "@/components/basics/basic-view/view-header";
import {RelationViewState, RelationViewType} from "@/model/relation-view-state";
import {Toggle} from "@/components/ui/toggle"

import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {Separator} from "@/components/ui/separator";
import {getPathFromRelation} from "@/model/relation";
import {HeaderDownloadButton, HeaderDownloadButtonContent} from "@/components/relation/header/header-download-button";
import {RelationState} from "@/model/relation-state";
import {useIsMobile} from "@/components/provider/responsive-node-provider";
import {
    DropdownMenu, DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuPortal,
    DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {useState} from "react";
import {FilepathDialog, FilepathDialogState} from "@/components/export/filepath-dialog";
import {RelationViewAPIProps, RelationViewProps} from "@/components/relation/relation-view";
import {createAdvancedRelationActions} from "@/state/relations/functions";
import {RelationSettings} from "@/components/relation/relation-settings";
import {RelationViewTypeSwitcher} from "@/components/relation/settings/relation-view-type-switcher";

export interface RelationViewHeaderProps extends RelationViewAPIProps{
    children?: React.ReactNode;
}

export function RelationViewHeader(inputProps: RelationViewHeaderProps) {


    const advancedActions = createAdvancedRelationActions(inputProps)
    const props: RelationViewProps = {
        ...inputProps,
        ...advancedActions,
    };

    const relationId = props.relationState.id;
    const {source, connectionId, viewState} = props.relationState;

    function onPathClick(element: string, index: number) {
        if (source.type === 'table') {
            if ( index === 0) {
                // connection, no action
            } else if (index === 1) {
                // showDatabase(relation.connectionId, relation.source.database);
            } else if (index === 2) {
                // showSchema(relation.connectionId, relation.source.database, relation.source.schema );
            } else if (index === 3) {
                // table, no action
            } else {
                console.error('Unknown path element', element, index);
            }
        }
    }

    const codeFenceState = viewState.codeFenceState;
    function onShowCode() {
        advancedActions.updateRelationViewState( {
            codeFenceState: {
                show: !codeFenceState.show,
            }
        });
    }

    function onViewChange(selected: string) {

        // only update if something selected
        if (!selected) {
            return;
        }
        advancedActions.updateRelationViewState( {
            selectedView: selected as RelationViewType,
        });
    }

    const lastExecutionDuration = props.relationState.lastExecutionMetaData?.lastExecutionDuration;
    const isMobile = useIsMobile();

    let durationString = '';
    if (lastExecutionDuration) {
        if (isMobile) {
            durationString = `in ${formatDuration(lastExecutionDuration)}`;
        } else {
            durationString += `(Took ${formatDuration(lastExecutionDuration)})`;
        }
    }

    const path = getPathFromRelation(source, connectionId);

    const mapDisabled = true;

    const queryToggleText = codeFenceState.show ? 'Hide Query' : 'Show Query'

    const [filepathDialogState, setFilepathDialogState] = useState<FilepathDialogState>({open: false, fileFormat: 'csv', relationId: relationId});

    return (
        <>
            <ViewHeader
                title={viewState.displayName}
                path={path}
                onPathClick={onPathClick}
                subtitle={durationString}
                state={props.relationState.executionState}
                actionButtons={
                    isMobile ?
                        <>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <Menu />
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
                                        onClick={onShowCode}
                                        title={queryToggleText}
                                    >
                                        <span>{queryToggleText}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem>Show as</DropdownMenuItem>
                                    <DropdownMenuCheckboxItem
                                        checked={viewState.selectedView === 'table'}
                                        onCheckedChange={() => onViewChange('table')}
                                    >
                                        <Sheet className="h-4 w-4"/>
                                        <span className="ml-2">Table</span>
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={viewState.selectedView === 'chart'}
                                        onCheckedChange={() => onViewChange('chart')}
                                    >
                                        <ChartSpline className="h-4 w-4"/>
                                        <span className="ml-2">Chart</span>
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={viewState.selectedView === 'map'}
                                        disabled={mapDisabled}
                                        onCheckedChange={() => onViewChange('map')}
                                    >
                                        <Map className="h-4 w-4"/>
                                        <span className="ml-2">Map</span>
                                    </DropdownMenuCheckboxItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                        :
                        <>

                            <Toggle
                                onClick={onShowCode}
                                pressed={codeFenceState.show}
                                title={queryToggleText}
                            >
                                <Code className="h-4 w-4"/>
                            </Toggle>
                            <Separator orientation={'vertical'}/>
                            <RelationViewTypeSwitcher
                                currentView={viewState.selectedView}
                                onViewChange={onViewChange}
                            />
                            <Separator orientation={'vertical'}/>
                            <RelationSettings {...props} align={"end"}/>
                            <Separator orientation={'vertical'}/>
                            <HeaderDownloadButton
                                state={filepathDialogState}
                                setState={setFilepathDialogState}
                            />
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
