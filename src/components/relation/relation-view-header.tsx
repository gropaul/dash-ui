import {RelationViewState} from "@/components/relation/relation-view";
import {RelationState} from "@/model/relation-state";


export interface RelationViewHeaderProps {
    relation: RelationState;
    viewState: RelationViewState;
    setViewState: (state: RelationViewState) => void;
}

export function RelationViewHeader({relation, viewState, setViewState}: RelationViewHeaderProps) {
    return (
        <div className="flex flex-row items-center justify-between w-full h-12 px-4 border-b border-gray-200">
            <div className="flex flex-row items-center">
                <div className="font-bold text-lg">{relation.name}</div>
                <div className="ml-4 text-sm text-gray-500">{relation.database}</div>
            </div>
            <div className="flex flex-row items-center">
                <button
                    className="px-2 py-1 text-sm text-gray-500 border border-gray-300 rounded-md hover:bg-gray-100"
                    onClick={() => setViewState({
                        ...viewState,
                        selectedView: 'table',
                    })}
                >
                    Table
                </button>
                <button
                    className="px-2 py-1 text-sm text-gray-500 border border-gray-300 rounded-md hover:bg-gray-100 ml-2"
                    onClick={() => setViewState({
                        ...viewState,
                        selectedView: 'chart',
                    })}
                >
                    Chart
                </button>
            </div>
        </div>
    )
}