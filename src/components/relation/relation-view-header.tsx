import {RelationState} from "@/model/relation-state";
import {Code} from "lucide-react";
import {RelationViewState} from "@/model/relation-view-state";
import {useRelationsState} from "@/state/relations.state";
import {shallow} from "zustand/shallow";


export interface RelationViewHeaderProps {
    relationId: string;
}

export function RelationViewHeader({relationId}: RelationViewHeaderProps) {

    const updateRelationViewState = useRelationsState((state) => state.updateRelationViewState);

    const relationName = useRelationsState((state) => state.getRelation(relationId)?.name, shallow);
    const databaseName = useRelationsState((state) => state.getRelation(relationId)?.database, shallow);

    const showCode = useRelationsState((state) => state.getRelationViewState(relationId).showCode, shallow);
    const selectedView = useRelationsState((state) => state.getRelationViewState(relationId).selectedView, shallow);

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

    return (
        <div className="flex flex-row items-center justify-between w-full h-12 px-4 border-b border-gray-200">
            <div className="flex flex-row items-center">
                <div className="font-bold text-lg">{relationName}</div>
                <div className="ml-4 text-sm text-gray-500">{databaseName}</div>
            </div>
            <div className="flex flex-row items-center">
                <button
                    className="px-2 py-1 text-sm text-gray-500 border border-gray-300 rounded-md hover:bg-gray-100 ml-2"
                    onClick={onShowCode}
                >
                    <Code size={16}/>
                </button>
                <button
                    className="px-2 py-1 text-sm text-gray-500 border border-gray-300 rounded-md hover:bg-gray-100"
                    onClick={onShowTable}
                >
                    Table
                </button>
                <button
                    className="px-2 py-1 text-sm text-gray-500 border border-gray-300 rounded-md hover:bg-gray-100 ml-2"
                    onClick={onShowChart}
                >
                    Chart
                </button>
            </div>
        </div>
    )
}