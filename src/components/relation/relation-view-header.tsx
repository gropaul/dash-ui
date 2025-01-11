import {ChartSpline, Code, Map, Sheet} from "lucide-react";
import {DeepPartial, formatDuration} from "@/platform/utils";
import {ViewHeader} from "@/components/basics/basic-view/view-header";
import {RelationViewState, RelationViewType} from "@/model/relation-view-state";
import {Toggle} from "@/components/ui/toggle"

import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {Separator} from "@/components/ui/separator";
import {getPathFromRelation} from "@/model/relation";
import {HeaderDownloadButton} from "@/components/relation/header/header-download-button";
import {RelationState} from "@/model/relation-state";

export interface RelationViewHeaderProps {
    relationState: RelationState;
    updateRelationViewState: (relationId: string, viewState: DeepPartial<RelationViewState>) => void,
    children?: React.ReactNode;
}

export function RelationViewHeader({relationState, updateRelationViewState}: RelationViewHeaderProps) {

    const relationId = relationState.id;
    const {source, connectionId, query, viewState} = relationState;

    const onRelationDisplayNameChange = (newName: string) => {
        updateRelationViewState(relationId, {
            displayName: newName,
        });
    }

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
        updateRelationViewState(relationId, {
            codeFenceState: {
                show: codeFenceState!.show,
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

    const lastExecutionDuration = relationState.lastExecutionMetaData?.lastExecutionDuration;

    let durationString = '';
    if (lastExecutionDuration) {
        durationString += `(Took ${formatDuration(lastExecutionDuration)})`;
    }

    const path = getPathFromRelation(source, connectionId);

    return (
        <>
            <ViewHeader
                title={viewState.displayName}
                onTitleChange={onRelationDisplayNameChange}
                path={path}
                onPathClick={onPathClick}
                subtitle={durationString}
                state={relationState.executionState}
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
                        <ToggleGroup rovingFocus type="single" value={viewState.selectedView} onValueChange={onViewChange}>
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
                        <HeaderDownloadButton
                            relationId={relationId}
                        />
                    </>
                }
            />
        </>
    );
}
