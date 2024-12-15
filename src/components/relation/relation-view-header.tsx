import {Code, Columns2, Rows2} from "lucide-react";
import { useRelationsState } from "@/state/relations.state";
import { shallow } from "zustand/shallow";
import { formatDuration } from "@/platform/utils";
import { ViewHeader } from "@/components/basics/basic-view/view-header";
import {RelationViewType} from "@/model/relation-view-state";
import {Select} from "@headlessui/react";
import {ButtonSelect} from "@/components/basics/input/button-select";

export interface RelationViewHeaderProps {
    relationId: string;
    children?: React.ReactNode;
}

export function RelationViewHeader({ relationId }: RelationViewHeaderProps) {
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
                ...codeFenceState,
                show: !codeFenceState.show,
            }
        });
    }

    function toggleCodeFenceLayout() {
        updateRelationViewState(relationId, {
            codeFenceState: {
                ...codeFenceState,
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
                        <button
                            className="text-sm text-gray-500 border border-gray-300 rounded-md hover:bg-gray-100 h-8 w-8 flex items-center justify-center"
                            onClick={toggleCodeFenceLayout}
                            title="Toggle Layout"
                        >
                            {codeFenceState.layout === 'column' ? <Rows2 size={16} /> : <Columns2 size={16}/>}
                        </button>
                        <button
                            className="text-sm text-gray-500 border border-gray-300 rounded-md hover:bg-gray-100 h-8 w-8 flex items-center justify-center"
                            onClick={onShowCode}
                            title="Show Query"
                        >
                            <Code size={16} />
                        </button>
                        <ButtonSelect
                            onChange={onViewChange}
                            defaultValue="table"
                            title="Select View"
                            options={[
                                {value: 'table', label: 'Table'},
                                {value: 'chart', label: 'Chart'},
                                {value: 'map', label: 'Map'},
                            ]}
                        />
                    </>
                }
            />
        </>
    );
}
