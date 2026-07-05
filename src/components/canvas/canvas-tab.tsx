import {useCallback, useState} from "react";
import {shallow} from "zustand/shallow";
import {useRelationsState} from "@/state/relations.state";
import {Flow} from "@/components/canvas/flow";
import {ReactFlowProvider} from "@xyflow/react";
import {RelationView} from "@/components/relation/relation-view";
import {RelationState} from "@/model/relation-state";


export interface WorkflowTabProps {
    canvasId: string;
}

export function CanvasTab(props: WorkflowTabProps) {
    const {canvasId} = props;

    const canvas = useRelationsState((state) => state.canvas[canvasId], shallow);
    const updateRelation = useRelationsState(state => state.updateRelation);
    const [fullscreenNodeId, setFullscreenNodeId] = useState<string | null>(null);

    const openFullscreen = useCallback((nodeId: string) => setFullscreenNodeId(nodeId), []);
    const onBackToCanvas = useCallback(() => setFullscreenNodeId(null), []);

    // Derive the relation ID for the fullscreen node (stable between renders)
    const fullscreenNode = fullscreenNodeId ? canvas?.nodes.find(n => n.id === fullscreenNodeId) : undefined;
    const fullscreenRelationId = (fullscreenNode?.data as {relationId?: string} | undefined)?.relationId;
    const fullscreenRelation = useRelationsState(
        state => fullscreenRelationId ? state.relations[fullscreenRelationId] : undefined,
        shallow,
    );

    if (!canvas) {
        return <div>Workflow not found: {canvasId}</div>;
    }

    if (fullscreenRelation) {
        const handleUpdateRelation = (newRelation: RelationState) => {
            updateRelation(newRelation);
        };

        return (
            <RelationView
                mode='fullscreen'
                relationState={fullscreenRelation}
                updateRelation={handleUpdateRelation}
                height={'fit'}
                breadcrumbPrefix={{label: canvas.viewState.displayName, onClick: onBackToCanvas}}
            />
        );
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
