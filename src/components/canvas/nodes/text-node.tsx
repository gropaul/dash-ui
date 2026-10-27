import {NodeProps, NodeResizer} from '@xyflow/react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {TextToolbar} from "./text/text-toolbar";
import {useCanvasState} from "@/components/canvas/canvas-context";
import {GRID_SIZE} from "@/components/canvas/logic/models";
import {DEFAULT_TEXT_NODE_DATA, TEXT_STYLES, TextNodeData} from "@/components/canvas/nodes/node-data";

const verticalAlignToFlex = {
    top: 'flex-start',
    center: 'center',
    bottom: 'flex-end',
} as const;

export function TextNode({id, data, selected, width, height}: NodeProps) {
    const rawData = data as unknown as Partial<TextNodeData> & { isNew?: boolean };
    const nodeData = {...DEFAULT_TEXT_NODE_DATA, ...rawData};
    const {text, textStyle, fontStyle, textAlign, verticalAlign, color} = nodeData;
    const styleConfig = TEXT_STYLES[textStyle];
    const {setNodes} = useCanvasState();

    const [isEditing, setIsEditing] = useState(false);
    const [localText, setLocalText] = useState(text);
    const editableRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setLocalText(text);
    }, [text]);

    // Auto-start editing for newly created nodes
    useEffect(() => {
        if (rawData.isNew) {
            setIsEditing(true);
            // Clear the isNew flag
            setNodes((nodes) =>
                nodes.map((node) =>
                    node.id === id
                        ? {...node, data: {...node.data, isNew: undefined}}
                        : node
                )
            );
        }
    }, [rawData.isNew, id, setNodes]);

    useEffect(() => {
        if (isEditing && editableRef.current) {
            // Set text content when entering edit mode
            editableRef.current.textContent = localText;
            editableRef.current.focus();
            // Select all text in contenteditable
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(editableRef.current);
            selection?.removeAllRanges();
            selection?.addRange(range);
        }
        // Only when editing starts: the text typed afterwards must not be written over.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditing]);

    const handleDoubleClick = useCallback(() => {
        setIsEditing(true);
    }, []);

    const saveText = useCallback((newText: string) => {
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === id
                    ? {...node, data: {...node.data, text: newText}}
                    : node
            )
        );
    }, [id, setNodes]);

    const handleBlur = useCallback(() => {
        setIsEditing(false);
        saveText(localText);
    }, [localText, saveText]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsEditing(false);
            saveText(localText);
        }
        // Prevent node deletion when typing
        e.stopPropagation();
    }, [localText, saveText]);

    const nodeWidth = width ?? 200;
    const nodeHeight = height ?? 100;

    return (
        <div
            style={{
                position: 'relative',
                width: nodeWidth,
                height: nodeHeight,
                backgroundColor: 'transparent',
                boxSizing: 'border-box',
            }}
            onDoubleClick={handleDoubleClick}
        >
            <TextToolbar
                nodeId={id}
                isVisible={selected ?? false}
                data={nodeData}
            />
            <NodeResizer
                lineClassName="z-40"
                isVisible={selected}
                minWidth={4 * GRID_SIZE}
                minHeight={2 * GRID_SIZE}
            />
            <div
                className={`w-full h-full p-0.5 flex ${isEditing ? 'nodrag' : ''}`}
                style={{
                    justifyContent: textAlign,
                    alignItems: verticalAlignToFlex[verticalAlign],
                    cursor: isEditing ? undefined : 'text',
                }}
            >
                <div
                    key={isEditing ? 'editing' : 'display'}
                    className="whitespace-pre-wrap break-words overflow-hidden w-full outline-none"
                    style={{
                        fontSize: `${styleConfig.fontSize}px`,
                        fontWeight: styleConfig.fontWeight,
                        fontFamily: styleConfig.fontFamily,
                        fontStyle,
                        textAlign,
                        color,
                        lineHeight: styleConfig.lineHeight,
                    }}
                    ref={isEditing ? editableRef : undefined}
                    contentEditable={isEditing}
                    suppressContentEditableWarning
                    onInput={isEditing ? (e) => setLocalText(e.currentTarget.textContent || '') : undefined}
                    onBlur={isEditing ? handleBlur : undefined}
                    onKeyDown={isEditing ? handleKeyDown : undefined}
                >
                    {!isEditing && !text && (
                        <span className="text-muted-foreground/50">Double-click to edit...</span>
                    )}
                    {!isEditing && text}
                </div>
            </div>
        </div>
    );
}
