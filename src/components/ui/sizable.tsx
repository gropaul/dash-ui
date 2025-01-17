import {useRef, useState} from "react";
import {MoveDiagonal2} from "lucide-react";
import {Separator} from "@/components/ui/separator";

export type Dimension = number | 'auto' | 'full';

export type ResizableElement = 'barTop' | 'barBottom' | 'barLeft' | 'barRight' | 'button';

export interface SizableProps {
    width: Dimension;
    height: Dimension; // if none the height will be auto

    minWidth?: number;
    minHeight?: number;

    maxWidth?: number;
    maxHeight?: number;

    onWidthChange?: (width: number) => void;
    onHeightChange?: (height: number) => void;
    allowResizeX?: boolean;
    allowResizeY?: boolean;

    preventDefault?: boolean;

    children: React.ReactNode;

    resizableElements?: ResizableElement[];

    grabZoneSize?: number; // Size of the invisible grab zone
}

export function Sizable(props: SizableProps) {
    if ((props.minWidth || props.maxWidth) && typeof props.width !== 'number') {
        throw new Error('minWidth and maxWidth can only be set if width is a number');
    }

    if ((props.minHeight || props.maxHeight) && typeof props.height !== 'number') {
        throw new Error('minHeight and maxHeight can only be set if height is a number');
    }

    const containerRef = useRef<HTMLDivElement>(null);
    const [currentWidth, setCurrentWidth] = useState(
        typeof props.width === 'number' ? props.width : 0
    );
    const [currentHeight, setCurrentHeight] = useState(
        typeof props.height === 'number' ? props.height : 0
    );

    const [updateWidth, setUpdateWidth] = useState(true);
    const [updateHeight, setUpdateHeight] = useState(true);

    const resizableElements = props.resizableElements || ['button'];

    const preventDefault = props.preventDefault ?? true;
    const grabZoneSize = props.grabZoneSize ?? 8; // Default grab zone size

    const handleMouseMove = (e: MouseEvent) => {

        if (preventDefault) {
            e.preventDefault();
        }

        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();

        if (props.allowResizeX && updateWidth) {
            const newWidth = Math.max(
                props.minWidth || 0,
                Math.min(props.maxWidth || Infinity, e.clientX - rect.left)
            );

            setCurrentWidth(newWidth);
            props.onWidthChange?.(newWidth);
        }

        if (props.allowResizeY && updateHeight) {
            const newHeight = Math.max(
                props.minHeight || 0,
                Math.min(props.maxHeight || Infinity, e.clientY - rect.top)
            );

            setCurrentHeight(newHeight);
            props.onHeightChange?.(newHeight);
        }
    };

    const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    const handleMouseDown = (e: React.MouseEvent, element: ResizableElement) => {
        e.preventDefault();

        switch (element) {
            case 'barTop':
            case 'barBottom':
                setUpdateHeight(true);
                setUpdateWidth(false);
                break;
            case 'barLeft':
            case 'barRight':
                setUpdateHeight(false);
                setUpdateWidth(true);
                break;
            case 'button':
                setUpdateHeight(true);
                setUpdateWidth(true);
                break;
        }

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div
            ref={containerRef}
            className="relative"
            style={{
                width:
                    props.width === 'full'
                        ? '100%'
                        : props.width === 'auto'
                            ? 'auto'
                            : currentWidth + 'px',
                height:
                    props.height === 'full'
                        ? '100%'
                        : props.height === 'auto'
                            ? 'auto'
                            : currentHeight + 'px',
            }}
        >
            {props.children}

            {resizableElements.includes('button') && (props.allowResizeX || props.allowResizeY) && (
                <div
                    onMouseDown={(e) => handleMouseDown(e, 'button')}
                    className={'text-muted-foreground'}
                    style={{
                        position: 'absolute',
                        right: grabZoneSize,
                        bottom: grabZoneSize,
                        cursor: 'nwse-resize',
                    }}
                >
                    <MoveDiagonal2 size={16}/>
                </div>
            )}
            {/* Horizontal bar on top */}
            {resizableElements.includes('barTop') && props.allowResizeY && (
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: -grabZoneSize+ 2,
                        width: '100%',
                        height: grabZoneSize * 2,
                        cursor: 'ns-resize',
                    }}
                    className={'flex items-center justify-center'}
                    onMouseDown={(e) => handleMouseDown(e, 'barTop')}
                >
                    <Separator orientation={'horizontal'}/>
                </div>
            )}
            {/* Horizontal bar on bottom */}
            {resizableElements.includes('barBottom') && props.allowResizeY && (
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        bottom: -grabZoneSize + 2,
                        width: '100%',
                        height: grabZoneSize * 2,
                        cursor: 'ns-resize',
                    }}
                    className={'flex items-center justify-center'}
                    onMouseDown={(e) => handleMouseDown(e, 'barBottom')}
                >
                    <Separator orientation={'horizontal'}/>
                </div>
            )}
            {/* Vertical bar on left */}
            {resizableElements.includes('barLeft') && props.allowResizeX && (
                <div
                    style={{
                        position: 'absolute',
                        left: -grabZoneSize+ 2,
                        top: 0,
                        width: grabZoneSize * 2,
                        height: '100%',
                        cursor: 'ew-resize',
                    }}
                    className={'flex items-center justify-center'}
                    onMouseDown={(e) => handleMouseDown(e, 'barLeft')}
                >
                    <Separator orientation={'vertical'}/>
                </div>
            )}
            {/* Vertical bar on right */}
            {resizableElements.includes('barRight') && props.allowResizeX && (
                <div
                    style={{
                        position: 'absolute',
                        right: -grabZoneSize+ 2,
                        top: 0,
                        width: grabZoneSize * 2,
                        height: '100%',
                        cursor: 'ew-resize',
                    }}
                    className={'flex items-center justify-center'}
                    onMouseDown={(e) => handleMouseDown(e, 'barRight')}
                >
                    <Separator orientation={'vertical'}/>
                </div>
            )}

        </div>
    );
}
