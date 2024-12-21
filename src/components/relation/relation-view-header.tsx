import {Code, Columns2, Rows2} from "lucide-react";
import {useRelationsState} from "@/state/relations.state";
import {shallow} from "zustand/shallow";
import {formatDuration} from "@/platform/utils";
import {ViewHeader} from "@/components/basics/basic-view/view-header";
import {RelationViewType} from "@/model/relation-view-state";
import {Toggle} from "@/components/ui/toggle"

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";

export interface RelationViewHeaderProps {
    relationId: string;
    children?: React.ReactNode;
}

export function RelationViewHeader({relationId}: RelationViewHeaderProps) {
    const updateRelationViewState = useRelationsState((state) => state.updateRelationViewState);

    const relationName = useRelationsState((state) => state.getRelation(relationId)?.name, shallow);
    const connectionName = useRelationsState((state) => state.getRelation(relationId)?.connectionId, shallow);
    const lastExecutionDuration = useRelationsState((state) => state.getRelation(relationId).lastExecutionMetaData?.lastExecutionDuration, shallow);
    const codeFenceState = useRelationsState((state) => state.getRelationViewState(relationId).codeFenceState!, shallow);

    const queryState = useRelationsState(
        (state) => state.getRelation(relationId).executionState,
        shallow
    );

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
        updateRelationViewState(relationId, {
            selectedView: selected as RelationViewType,
        });
    }

    let textDurationAndConnection = connectionName;
    if (lastExecutionDuration) {
        textDurationAndConnection += ` (${formatDuration(lastExecutionDuration)})`;
    }

    return (
        <>
            <ViewHeader
                title={relationName}
                subtitle={textDurationAndConnection}
                state={queryState}
                actionButtons={
                    <>

                        <Toggle
                            className={'w-[32px] h-8 p-0 m-0'}
                            variant={'outline'}
                            onClick={onShowCode}
                            pressed={codeFenceState.show}
                            title={codeFenceState.show ? 'Hide code' : 'Show code'}
                        >
                            <Code
                                className={'hover:text-primary cursor-pointer text-muted-foreground'}
                                size={16}
                            />
                        </Toggle>
                        <Select onValueChange={onViewChange} defaultValue={'table'}>
                            <SelectTrigger className={'h-8 text-primary'} >
                                <SelectValue placeholder="Select a fruit"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Display as</SelectLabel>
                                    <SelectItem value="table">Table</SelectItem>
                                    <SelectItem value="chart">Chart</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </>
                }
            />
        </>
    );
}
