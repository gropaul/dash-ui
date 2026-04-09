import {useCallback, useState} from "react";
import {shallow} from "zustand/shallow";
import {useRelationsState} from "@/state/relations.state";
import {Flow} from "@/components/canvas/flow";
import {ReactFlowProvider} from "@xyflow/react";
import {InputManager} from "@/components/editor/inputs/input-manager";
import {RelationState} from "@/model/relation-state";
import {RelationView} from "@/components/relation/relation-view";


export interface WorkflowTabProps {
    canvasId: string;
}

export function CanvasTab(props: WorkflowTabProps) {
    const {canvasId} = props;

    const canvas = useRelationsState((state) => state.canvas[canvasId], shallow);
    const updateCanvasState = useRelationsState(state => state.updateCanvasState);
    const [fullscreenNodeId, setFullscreenNodeId] = useState<string | null>(null);
    const [manager] = useState(() => new InputManager());

    const openFullscreen = useCallback((nodeId: string) => setFullscreenNodeId(nodeId), []);
    const onBackToCanvas = useCallback(() => setFullscreenNodeId(null), []);

    if (!canvas) {
        return <div>Workflow not found: {canvasId}</div>;
    }

    if (fullscreenNodeId) {
        const node = canvas.nodes.find(n => n.id === fullscreenNodeId);
        const relationData = (node?.data as {relationData?: RelationState} | undefined)?.relationData;

        if (relationData) {
            const updateRelation = (newRelation: RelationState) => {
                updateCanvasState(canvasId, {
                    nodes: canvas.nodes.map(n =>
                        n.id === fullscreenNodeId
                            ? {...n, data: {...n.data, relationData: newRelation}}
                            : n
                    ),
                });
            };

            return (
                <RelationView
                    mode='fullscreen'
                    relationState={relationData}
                    updateRelation={updateRelation}
                    inputManager={manager}
                    height={'fit'}
                    breadcrumbPrefix={{label: canvas.viewState.displayName, onClick: onBackToCanvas}}
                />
            );
        }
    }

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-1 overflow-auto relative">
                {canvas.viewState.displayName}
            </div>
            <ReactFlowProvider>
                <Flow canvasId={canvasId} openFullscreen={openFullscreen}/>
            </ReactFlowProvider>
        </div>
    );
}
