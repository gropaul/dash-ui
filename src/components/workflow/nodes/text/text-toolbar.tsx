import {NodeToolbar, Position, useReactFlow} from '@xyflow/react';
import {Button} from "@/components/ui/button";
import {
    AlignCenter,
    AlignLeft,
    AlignRight,
    AlignVerticalJustifyCenter,
    AlignVerticalJustifyEnd,
    AlignVerticalJustifyStart,
    ChevronDown,
    Code,
    Heading1,
    Heading2,
    Heading3,
    Heading4,
    Heading5,
    Italic,
    Text,
    Trash2
} from "lucide-react";
import {Toggle} from "@/components/ui/toggle";
import {ColorPalette} from "@/components/ui/color-palette";
import {TextNodeData, TextStyle} from "../text-node";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

type TextAlign = 'left' | 'center' | 'right';
type VerticalAlign = 'top' | 'center' | 'bottom';

const textStyleOptions: { id: TextStyle; label: string; icon: React.ReactNode }[] = [
    {id: 'h1', label: 'Heading 1', icon: <Heading1 className="h-4 w-4"/>},
    {id: 'h2', label: 'Heading 2', icon: <Heading2 className="h-4 w-4"/>},
    {id: 'h3', label: 'Heading 3', icon: <Heading3 className="h-4 w-4"/>},
    {id: 'h4', label: 'Heading 4', icon: <Heading4 className="h-4 w-4"/>},
    {id: 'h5', label: 'Heading 5', icon: <Heading5 className="h-4 w-4"/>},
    {id: 'body', label: 'Body', icon: <Text className="h-4 w-4"/>},
    {id: 'code', label: 'Code', icon: <Code className="h-4 w-4"/>},
];

const alignOptions: { id: TextAlign; label: string; icon: React.ReactNode }[] = [
    {id: 'left', label: 'Left', icon: <AlignLeft className="h-4 w-4"/>},
    {id: 'center', label: 'Center', icon: <AlignCenter className="h-4 w-4"/>},
    {id: 'right', label: 'Right', icon: <AlignRight className="h-4 w-4"/>},
];

const verticalAlignOptions: { id: VerticalAlign; label: string; icon: React.ReactNode }[] = [
    {id: 'top', label: 'Top', icon: <AlignVerticalJustifyStart className="h-4 w-4"/>},
    {id: 'center', label: 'Center', icon: <AlignVerticalJustifyCenter className="h-4 w-4"/>},
    {id: 'bottom', label: 'Bottom', icon: <AlignVerticalJustifyEnd className="h-4 w-4"/>},
];

interface TextToolbarProps {
    nodeId: string;
    isVisible: boolean;
    data: TextNodeData;
}

export function TextToolbar({nodeId, isVisible, data}: TextToolbarProps) {
    const {setNodes, deleteElements} = useReactFlow();

    const updateNodeData = (updates: Partial<TextNodeData>) => {
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === nodeId
                    ? {...node, data: {...node.data, ...updates}}
                    : node
            )
        );
    };

    const handleDelete = () => {
        deleteElements({nodes: [{id: nodeId}]});
    };

    const currentTextStyle = textStyleOptions.find(opt => opt.id === data.textStyle) || textStyleOptions[5];
    const currentAlign = alignOptions.find(opt => opt.id === data.textAlign) || alignOptions[1];
    const currentVerticalAlign = verticalAlignOptions.find(opt => opt.id === data.verticalAlign) || verticalAlignOptions[1];

    return (
        <NodeToolbar isVisible={isVisible} position={Position.Top} align="center">
            <div className="flex flex-row items-center bg-background border rounded-2xl shadow-sm">
                <Button
                    className="rounded-l-2xl rounded-r-none w-10 h-10"
                    variant="ghost"
                    size="icon"
                    onClick={handleDelete}
                >
                    <Trash2 className="h-4 w-4"/>
                </Button>
                <div className="w-[1px] h-10 bg-border"/>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            className="rounded-none w-fit h-10 flex items-center justify-between gap-1 px-3"
                            variant="ghost"
                        >
                            <span className="flex items-center gap-2">
                                {currentTextStyle.icon}
                                <span className="text-sm">{currentTextStyle.label}</span>
                            </span>
                            <ChevronDown className="w-3 h-3"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        {textStyleOptions.map((option) => (
                            <DropdownMenuItem
                                key={option.id}
                                onClick={() => updateNodeData({textStyle: option.id})}
                                className={data.textStyle === option.id ? 'bg-accent' : ''}
                            >
                                {option.icon}
                                <span className="ml-2">{option.label}</span>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                <div className="w-[1px] h-10 bg-border"/>

                <Toggle
                    className="rounded-none w-10 h-10"
                    pressed={data.fontStyle === 'italic'}
                    onPressedChange={(pressed) =>
                        updateNodeData({fontStyle: pressed ? 'italic' : 'normal'})
                    }
                >
                    <Italic className="h-4 w-4"/>
                </Toggle>
                <div className="w-[1px] h-10 bg-border"/>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            className="rounded-none w-14 h-10 flex items-center justify-center gap-1"
                            variant="ghost"
                            size="icon"
                        >
                            {currentAlign.icon}
                            <ChevronDown className="w-3 h-3"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        {alignOptions.map((option) => (
                            <DropdownMenuItem
                                key={option.id}
                                onClick={() => updateNodeData({textAlign: option.id})}
                                className={data.textAlign === option.id ? 'bg-accent' : ''}
                            >
                                {option.icon}
                                <span className="ml-2">{option.label}</span>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            className="rounded-none w-14 h-10 flex items-center justify-center gap-1"
                            variant="ghost"
                            size="icon"
                        >
                            {currentVerticalAlign.icon}
                            <ChevronDown className="w-3 h-3"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        {verticalAlignOptions.map((option) => (
                            <DropdownMenuItem
                                key={option.id}
                                onClick={() => updateNodeData({verticalAlign: option.id})}
                                className={data.verticalAlign === option.id ? 'bg-accent' : ''}
                            >
                                {option.icon}
                                <span className="ml-2">{option.label}</span>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                <div className="w-[1px] h-10 bg-border"/>

                <div className="px-2">
                    <ColorPalette
                        color={data.color}
                        onChange={(color) => updateNodeData({color})}
                    />
                </div>
            </div>
        </NodeToolbar>
    );
}
