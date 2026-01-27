import { Handle, Position, HandleType } from '@xyflow/react';

interface ConditionalHandlesProps {
    type: HandleType;
    isHovered: boolean;
    closestHandle: Position;
}

export function ConditionalHandles({ type, isHovered, closestHandle }: ConditionalHandlesProps) {
    const getOpacity = (position: Position) => {
        if (!isHovered) return 0;
        return closestHandle === position ? 1 : 0;
    };

    return (
        <div className="pointer-events-none">
            <Handle
                type={type}
                position={Position.Top}
                id="a"
                style={{ opacity: getOpacity(Position.Top), pointerEvents: 'auto' }}
            />
            <Handle
                type={type}
                position={Position.Right}
                id="b"
                style={{ opacity: getOpacity(Position.Right), pointerEvents: 'auto' }}
            />
            <Handle
                type={type}
                position={Position.Bottom}
                id="c"
                style={{ opacity: getOpacity(Position.Bottom), pointerEvents: 'auto' }}
            />
            <Handle
                type={type}
                position={Position.Left}
                id="d"
                style={{ opacity: getOpacity(Position.Left), pointerEvents: 'auto' }}
            />
        </div>
    );
}
