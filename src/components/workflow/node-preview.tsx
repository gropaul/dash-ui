import {CanvasState} from "@/components/workflow/models";
import {useReactFlow, useViewport} from "@xyflow/react";

export interface NodePreviewProps {
    canvasState: CanvasState
}

export function NodePreview(props: NodePreviewProps) {
    const { screenToFlowPosition, flowToScreenPosition } = useReactFlow();
    const viewport = useViewport(); // Subscribe to viewport changes (zoom/pan)

    if (props.canvasState.selectedTool !== 'create-node' || !props.canvasState.previewMousePosition) {
        return null;
    }

    // Convert screen position to flow coordinates
    const flowPosition = screenToFlowPosition({
        x: props.canvasState.previewMousePosition.x,
        y: props.canvasState.previewMousePosition.y,
    });

    const flowLowerRight = {
        x: flowPosition.x + props.canvasState.nodeAdded.size.width,
        y: flowPosition.y + props.canvasState.nodeAdded.size.height,
    }

    // Convert back to screen coordinates
    const screenLowerRight = flowToScreenPosition(flowLowerRight);
    const scaledWidth = screenLowerRight.x - props.canvasState.previewMousePosition.x;
    const scaledHeight = screenLowerRight.y - props.canvasState.previewMousePosition.y;


    return (
        <div
            style={{
                position: 'absolute',
                left: props.canvasState.previewMousePosition.x,
                top: props.canvasState.previewMousePosition.y,
                width: scaledWidth,
                height: scaledHeight,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                border: '2px dashed rgba(0, 0, 0, 0.3)',
                pointerEvents: 'none',
                zIndex: 100,
            }}
        />
    );
}