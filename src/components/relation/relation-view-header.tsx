import {Code} from "lucide-react";
import {useRelationsState} from "@/state/relations.state";
import {shallow} from "zustand/shallow";
import {formatDuration} from "@/platform/utils";
import {ViewHeader} from "@/components/basics/basic-view/view-header";


export interface RelationViewHeaderProps {
    relationId: string;
    children?: React.ReactNode;
}

export function RelationViewHeader({relationId}: RelationViewHeaderProps) {

    const updateRelationViewState = useRelationsState((state) => state.updateRelationViewState);

    const relationName = useRelationsState((state) => state.getRelation(relationId)?.name, shallow);
    const connectionName = useRelationsState((state) => state.getRelation(relationId)?.connectionId, shallow);
    const lastExecutionDuration = useRelationsState((state) => state.getRelation(relationId).lastExecutionMetaData?.lastExecutionDuration, shallow);
    const showCode = useRelationsState((state) => state.getRelationViewState(relationId).showCode, shallow);

    const queryState = useRelationsState(
        (state) => state.getRelation(relationId).executionState,
        shallow
    );

    function onShowCode() {
        updateRelationViewState(relationId, {
            showCode: !showCode,
        });
    }

    function onShowTable() {
        updateRelationViewState(relationId, {
            selectedView: 'table',
        });
    }

    function onShowChart() {
        updateRelationViewState(relationId, {
            selectedView: 'chart',
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
                            onClick={onShowCode}
                            title="Show Query"
                        >
                            <Code size={16}/>
                        </button>
                        <button
                            className="px-2 py-1 text-sm text-gray-500 border border-gray-300 rounded-md hover:bg-gray-100 h-8 ml-2"
                            onClick={onShowTable}
                        >
                            Table
                        </button>
                        <button
                            className="px-2 py-1 text-sm text-gray-500 border border-gray-300 rounded-md hover:bg-gray-100 ml-2 h-8"
                            onClick={onShowChart}
                        >
                            Chart
                        </button>
                    </>
                }
            />
        </>
    )
}