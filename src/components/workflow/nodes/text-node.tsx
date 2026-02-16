import {NodeProps, NodeResizer, useReactFlow} from '@xyflow/react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {TextToolbar} from "./text/text-toolbar";

export type TextStyle = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'body' | 'code';

export interface TextStyleConfig {
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    fontFamily: string;
    lineHeight: number;
}

export const TEXT_STYLES: Record<TextStyle, TextStyleConfig> = {
    h1: {fontSize: 36, fontWeight: 'bold', fontFamily: 'inherit', lineHeight: 1.2},
    h2: {fontSize: 30, fontWeight: 'bold', fontFamily: 'inherit', lineHeight: 1.25},
    h3: {fontSize: 24, fontWeight: 'bold', fontFamily: 'inherit', lineHeight: 1.3},
    h4: {fontSize: 20, fontWeight: 'bold', fontFamily: 'inherit', lineHeight: 1.35},
    h5: {fontSize: 16, fontWeight: 'bold', fontFamily: 'inherit', lineHeight: 1.4},
    body: {fontSize: 16, fontWeight: 'normal', fontFamily: 'inherit', lineHeight: 1.5},
    code: {fontSize: 14, fontWeight: 'normal', fontFamily: 'monospace', lineHeight: 1.4},
};

export interface TextNodeData {
    text: string;
    textStyle: TextStyle;
    fontStyle: 'normal' | 'italic';
    textAlign: 'left' | 'center' | 'right';
    verticalAlign: 'top' | 'center' | 'bottom';
    color: string;
}

export const DEFAULT_TEXT_NODE_DATA: TextNodeData = {
    text: '',
    textStyle: 'body',
    fontStyle: 'normal',
    textAlign: 'center',
    verticalAlign: 'center',
    color: '#000000',
};

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
    const {setNodes} = useReactFlow();

    const [isEditing, setIsEditing] = useState(false);
    const [localText, setLocalText] = useState(text);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
        }
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
                minWidth={50}
                minHeight={30}
            />
            {isEditing ? (
                <div
                    className="w-full h-full flex p-2 nodrag"
                    style={{
                        justifyContent: textAlign,
                        alignItems: verticalAlignToFlex[verticalAlign],
                    }}
                >
                    <textarea
                        ref={textareaRef}
                        value={localText}
                        onChange={(e) => setLocalText(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        className="w-full h-full resize-none border-none outline-none bg-transparent"
                        style={{
                            fontSize: `${styleConfig.fontSize}px`,
                            fontWeight: styleConfig.fontWeight,
                            fontFamily: styleConfig.fontFamily,
                            fontStyle,
                            textAlign,
                            color,
                            lineHeight: styleConfig.lineHeight,
                        }}
                        placeholder="Enter text..."
                    />
                </div>
            ) : (
                <div
                    className="w-full h-full p-2 flex"
                    style={{
                        justifyContent: textAlign,
                        alignItems: verticalAlignToFlex[verticalAlign],
                        cursor: 'text',
                    }}
                >
                    <div
                        className="whitespace-pre-wrap break-words overflow-hidden"
                        style={{
                            fontSize: `${styleConfig.fontSize}px`,
                            fontWeight: styleConfig.fontWeight,
                            fontFamily: styleConfig.fontFamily,
                            fontStyle,
                            textAlign,
                            color,
                            lineHeight: styleConfig.lineHeight,
                            width: '100%',
                        }}
                    >
                        {text || <span className="text-muted-foreground/50">Double-click to edit...</span>}
                    </div>
                </div>
            )}
        </div>
    );
}
