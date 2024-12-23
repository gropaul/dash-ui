import {ChartSpline, Code, Download, Eye, EyeOff, ImageDown, Map, Menu, Sheet} from "lucide-react";
import {useRelationsState} from "@/state/relations.state";
import {shallow} from "zustand/shallow";
import {formatDuration} from "@/platform/utils";
import {ViewHeader} from "@/components/basics/basic-view/view-header";
import {RelationViewType} from "@/model/relation-view-state";
import {Toggle} from "@/components/ui/toggle"

import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {Separator} from "@/components/ui/separator";
import {Button} from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent, DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuPortal,
    DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {getPathFromRelation} from "@/model/relation";

export interface RelationViewHeaderProps {
    relationId: string;
    children?: React.ReactNode;
}

export function RelationViewHeader({relationId}: RelationViewHeaderProps) {
    const updateRelationViewState = useRelationsState((state) => state.updateRelationViewState);

    const relationName = useRelationsState((state) => state.getRelation(relationId)?.name, shallow);
    const relation = useRelationsState((state) => state.getRelation(relationId), shallow);
    const lastExecutionDuration = useRelationsState((state) => state.getRelation(relationId).lastExecutionMetaData?.lastExecutionDuration, shallow);
    const codeFenceState = useRelationsState((state) => state.getRelationViewState(relationId).codeFenceState!, shallow);
    const currentView = useRelationsState((state) => state.getRelationViewState(relationId).selectedView, shallow);
    const showChartSettings = useRelationsState((state) => state.getRelationViewState(relationId).chartState.view.showConfig, shallow);

    const showSchema = useRelationsState((state) => state.showSchema);
    const showDatabase = useRelationsState((state) => state.showDatabase);

    const queryState = useRelationsState(
        (state) => state.getRelation(relationId).executionState,
        shallow
    );

    function onPathClick(element: string, index: number) {
        if (relation.source.type === 'table') {
            console.log('Table path click', element, index);
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

    function onShowChartSettings() {
        updateRelationViewState(relationId, {
            chartState: {
                view: {
                    showConfig: !showChartSettings,
                }
            }
        });
    }

    function onShowCode() {
        updateRelationViewState(relationId, {
            codeFenceState: {
                show: !codeFenceState.show,
            }
        });
    }

    function toggleCodeFenceLayout() {
        updateRelationViewState(relationId, {
            codeFenceState: {
                layout: codeFenceState.layout === 'column' ? 'row' : 'column',
            }
        });
    }

    function onViewChange(selected: string) {

        // only update if something selected
        if (!selected) {
            return;
        }
        updateRelationViewState(relationId, {
            selectedView: selected as RelationViewType,
        });
    }

    let durationString = '';
    if (lastExecutionDuration) {
        durationString += `(Took ${formatDuration(lastExecutionDuration)})`;
    }

    const path = getPathFromRelation(relation);

    return (
        <>
            <ViewHeader
                title={relationName}
                path={path}
                onPathClick={onPathClick}
                subtitle={durationString}
                state={queryState}
                actionButtons={
                    <>

                        <Toggle
                            onClick={onShowCode}
                            pressed={codeFenceState.show}
                            title={codeFenceState.show ? 'Hide query' : 'Show query'}
                        >
                            <Code className="h-4 w-4"/>
                        </Toggle>
                        <Separator orientation={'vertical'}/>
                        <ToggleGroup rovingFocus type="single" value={currentView} onValueChange={onViewChange}>
                            <ToggleGroupItem value="table" aria-label="Table view" title={'Table view'}>
                                <Sheet className="h-4 w-4"/>
                            </ToggleGroupItem>
                            <ToggleGroupItem value="chart" aria-label="Chart view" title={'Chart view'}>
                                <ChartSpline className="h-4 w-4"/>
                            </ToggleGroupItem>
                            <ToggleGroupItem value="map" aria-label="Map view" disabled title={'Not implemented'}>
                                <Map className="h-4 w-4"/>
                            </ToggleGroupItem>
                        </ToggleGroup>
                        <Separator orientation={'vertical'}/>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant={'ghost'} size={'icon'}>
                                    <Download className="h-4 w-4"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-32">
                                <DropdownMenuLabel>Export as ... </DropdownMenuLabel>
                                <DropdownMenuSeparator/>
                                <DropdownMenuGroup>
                                    <DropdownMenuItem>CSV</DropdownMenuItem>
                                    <DropdownMenuItem>JSON</DropdownMenuItem>
                                    <DropdownMenuItem>Excel</DropdownMenuItem>
                                    <DropdownMenuItem>Parquet</DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                }
            />
        </>
    );
}
