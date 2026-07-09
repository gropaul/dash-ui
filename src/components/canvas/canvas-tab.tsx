import {useCallback} from "react";
import {shallow} from "zustand/shallow";
import {useRelationsState} from "@/state/relations.state";
import {aliasRelationRoute, buildRoutableTree} from "@/state/routing/routable-tree";
import {navigate} from "@/state/routing/navigation";
import {Flow} from "@/components/canvas/flow";
import {ReactFlowProvider} from "@xyflow/react";


export interface WorkflowTabProps {
    canvasId: string;
}

export function CanvasTab(props: WorkflowTabProps) {
    const {canvasId} = props;

    const canvas = useRelationsState((state) => state.canvas[canvasId], shallow);

    // Expand a node → navigate to its relation shown in this canvas' context
    // (`…/Canvas/Relation`), not the relation's canonical path.
    const openRelation = useCallback((nodeId: string) => {
        const st = useRelationsState.getState();
        const node = st.canvas[canvasId]?.nodes.find(n => n.id === nodeId);
        const relationId = (node?.data as {relationId?: string} | undefined)?.relationId;
        if (!relationId) return;
        const tree = buildRoutableTree(st.editorElements, st.relations, st.dashboards, st.canvas);
        const route = aliasRelationRoute(tree, canvasId, relationId);
        if (route) navigate(route);
    }, [canvasId]);

    if (!canvas) {
        return <div>Workflow not found: {canvasId}</div>;
    }

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-1 overflow-auto relative">
                {canvas.viewState.displayName}
            </div>
            <ReactFlowProvider>
                <Flow canvasId={canvasId} openFullscreen={openRelation}/>
            </ReactFlowProvider>
        </div>
    );
}
