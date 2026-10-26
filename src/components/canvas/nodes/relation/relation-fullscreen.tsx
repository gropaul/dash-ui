'use client';

import React from "react";
import {Node} from "@xyflow/react";
import {Dialog, DialogContent, DialogTitle} from "@/components/ui/dialog";
import {RelationView} from "@/components/relation/relation-view";
import {useBlockFullscreen} from "@/components/page-editor/block-relation";
import {useCanvasState} from "@/components/canvas/canvas-context";
import {RelationNodeData, useRelationNodeModel} from "@/components/canvas/logic/canvas-file";

/** The query node opened in the full view, in a dialog; its changes go into the node's block. */
export function RelationFullscreenDialog({nodes}: { nodes: Node[] }) {
    const nodeId = useBlockFullscreen(s => s.blockId);
    const node = nodes.find(n => n.id === nodeId);
    const close = () => useBlockFullscreen.getState().open(null);

    return (
        <Dialog open={!!node} onOpenChange={open => !open && close()}>
            <DialogContent className="flex h-[90vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden p-0">
                {node && <FullscreenNode node={node}/>}
            </DialogContent>
        </Dialog>
    );
}

function FullscreenNode({node}: { node: Node }) {
    const {canvasId: path, setNodes} = useCanvasState();
    const model = useRelationNodeModel(path, node.id, (node.data as RelationNodeData).body, setNodes);
    if (!model) return null;
    return (
        <>
            <DialogTitle className="sr-only">{model.relation.viewState.displayName}</DialogTitle>
            <div className="min-h-0 flex-1">
                <RelationView mode='fullscreen' height='fit' relationState={model.relation} updateRelation={model.updateRelation}/>
            </div>
        </>
    );
}
