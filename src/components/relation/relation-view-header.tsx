import {RelationState} from "@/model/relation-state";
import {Code} from "lucide-react";
import {RelationViewState} from "@/model/relation-view-state";


export interface RelationViewHeaderProps {
    relationState: RelationState;
    setRelationViewState: (state: RelationViewState) => void;
}

export function RelationViewHeader({relationState, setRelationViewState}: RelationViewHeaderProps) {

    function onShowCode() {
        setRelationViewState({
            ...relationState.viewState,
            showCode: !relationState.viewState.showCode,
        });
    }

    function onShowTable() {
        setRelationViewState({
            ...relationState.viewState,
            selectedView: 'table',
        });
    }

    function onShowChart() {
        setRelationViewState({
            ...relationState.viewState,
            selectedView: 'chart',
        });
    }

    return (
        <div className="flex flex-row items-center justify-between w-full h-12 px-4 border-b border-gray-200">
            <div className="flex flex-row items-center">
                <div className="font-bold text-lg">{relationState.name}</div>
                <div className="ml-4 text-sm text-gray-500">{relationState.database}</div>
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