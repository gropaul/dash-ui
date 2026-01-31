import {Handle, Position, HandleType} from '@xyflow/react';
import {ArrowUp, ArrowRight, ArrowDown, ArrowLeft} from 'lucide-react';

interface ConditionalHandlesProps {
    type: HandleType;
    isHovered: boolean;
    closestHandle: Position;
    isSelected: boolean;
}

const HANDLE_MARGIN_INACTIVE = -8;
const HANDLE_MARGIN_ACTIVE = -16;

const handlePositions = [
    {position: Position.Top, id: 'a', Icon: ArrowUp, offsetKey: 'top' as const},
    {position: Position.Right, id: 'b', Icon: ArrowRight, offsetKey: 'right' as const},
    {position: Position.Bottom, id: 'c', Icon: ArrowDown, offsetKey: 'bottom' as const},
    {position: Position.Left, id: 'd', Icon: ArrowLeft, offsetKey: 'left' as const},
];

export function ConditionalHandles({type, isHovered, closestHandle, isSelected}: ConditionalHandlesProps) {
    const isActive = (position: Position) => isHovered && closestHandle === position;

    if (!isSelected) return null;

    return (
        <>
            {handlePositions.map(({position, id, Icon, offsetKey}) => {
                const active = isActive(position);
                const margin = active ? HANDLE_MARGIN_ACTIVE : HANDLE_MARGIN_INACTIVE;
                return (
                    <Handle
                        key={id}
                        type={type}
                        position={position}
                        id={id}
                        className="!border-0 !bg-transparent transition-all duration-200"
                        style={{pointerEvents: active ? 'auto' : 'none', [offsetKey]: margin}}
                    >
                        <div
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-200 ease-out pointer-events-none"
                            style={{
                                width: active ? 24 : 8,
                                height: active ? 24 : 8,
                                borderRadius: '50%',
                                backgroundColor: active ? 'white' : '#8b5cf6',
                                border: active ? '1px solid #8b5cf6' : 'none',
                                opacity: active ? 1 : 0.6,
                            }}
                        >
                            {active && (
                                <Icon
                                    size={16}
                                    strokeWidth={2}
                                    style={{color: '#8b5cf6'}}
                                    className="transition-opacity duration-200"
                                />
                            )}
                        </div>
                    </Handle>
                );
            })}
        </>
    );
}
