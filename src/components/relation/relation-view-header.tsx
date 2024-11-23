import {Code} from "lucide-react";
import {useRelationsState} from "@/state/relations.state";
import {shallow} from "zustand/shallow";
import {useEffect, useState} from "react";
import {LOADING_TIMER_OFFSET} from "@/platform/global-data";
import {formatDuration} from "@/platform/utils";


export interface RelationViewHeaderProps {
    relationId: string;
}

export function RelationViewHeader({relationId}: RelationViewHeaderProps) {

    const updateRelationViewState = useRelationsState((state) => state.updateRelationViewState);

    const relationName = useRelationsState((state) => state.getRelation(relationId)?.name, shallow);
    const databaseName = useRelationsState((state) => state.getRelation(relationId)?.database, shallow);
    const connectionName = useRelationsState((state) => state.getRelation(relationId)?.connectionId, shallow);
    const lastExecutionDuration = useRelationsState((state) => state.getRelation(relationId).lastExecutionMetaData?.lastExecutionDuration, shallow);
    const showCode = useRelationsState((state) => state.getRelationViewState(relationId).showCode, shallow);
    const selectedView = useRelationsState((state) => state.getRelationViewState(relationId).selectedView, shallow);
    const executionState = useRelationsState((state) => state.getRelation(relationId).executionState, shallow);
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
            <div className="flex flex-row items-center justify-between w-full h-[48px] px-4">
                <div className="flex flex-row items-center">
                    <div className="font-bold text-lg">{relationName}</div>
                    <div className="ml-4 text-sm text-gray-500">{textDurationAndConnection}</div>
                </div>
                <div className="flex flex-row items-center">
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
                </div>
            </div>
            <RelationViewHeaderBorder relationId={relationId}/>
        </>
    )
}


interface RelationViewHeaderBorderProps {
    relationId: string;
}


export function RelationViewHeaderBorder({relationId}: RelationViewHeaderBorderProps) {
    const queryState = useRelationsState(
        (state) => state.getRelation(relationId).executionState,
        shallow
    );

    const [showLoading, setShowLoading] = useState(false);


    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;

        if (queryState === 'running') {
            // Set a delay before showing the animation
            timer = setTimeout(() => {
                setShowLoading(true);
            }, LOADING_TIMER_OFFSET);
        } else {
            // If the query state changes from running, reset the loading state
            setShowLoading(false);
            if (timer) {
                clearTimeout(timer);
            }
        }

        return () => {
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, [queryState]);

    return (
        <div className="relative w-full h-[1px] bg-gray-200">
            {queryState === 'running' && showLoading ? (
                // Animated loading indicator
                <div className="absolute top-0 left-0 w-full h-full bg-black animate-loading"/>
            ) : (
                // Solid border for idle state
                <div className="absolute top-0 left-0 w-full h-full bg-gray-200 dark:bg-gray-700"/>
            )}
            <style jsx>{`
                @keyframes loading {
                    0% {
                        transform: translateX(-100%);
                    }
                    100% {
                        transform: translateX(100%);
                    }
                }

                .animate-loading {
                    background: linear-gradient(
                            90deg,
                            black 0%,
                            rgba(0, 0, 0, 0.7) 50%,
                            black 100%
                    );
                    animation: loading 1.5s infinite;
                }
            `}</style>
        </div>
    );
}
