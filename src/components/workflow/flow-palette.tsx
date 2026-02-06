import {Sheet, BarChart3, Text, MousePointer2, Hand, Pencil} from 'lucide-react';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import {NodeTemplate, Position} from "@/components/workflow/flow";
import {ReactNode} from "react";
import {
    DEFAULT_CHART_SIZE,
    DEFAULT_NODE_SIZE,
    DEFAULT_TEXT_SIZE,
    CanvasState
} from "@/components/workflow/models";

interface NodePaletteProps {
    canvasState: CanvasState;
    setCanvasState: (state: CanvasState) => void;
}

export interface NodePaletteItem extends NodeTemplate {
    label: string;
    icon: React.ReactNode;
    selectAfterCreation: boolean;
}

export const nodeTypes: NodePaletteItem[] = [
    {
        type: 'relationNode', label: 'Relation',
        icon: <Sheet size={20} strokeWidth={1.5}/>, size: DEFAULT_NODE_SIZE,
        selectAfterCreation: true,
    },
    {   type: 'chartNode', label: 'Chart',
        icon: <BarChart3 size={20} strokeWidth={1.5}/>, size: DEFAULT_CHART_SIZE,
        selectAfterCreation: true
    },
    {
        type: 'textNode', label: 'Text',
        icon: <Text size={20} strokeWidth={1.5}/>,
        size: DEFAULT_TEXT_SIZE,
        selectAfterCreation: true
    },
];

export function FlowPalette({setCanvasState, canvasState}: NodePaletteProps) {


    function startCreatingNode(nodeType: NodePaletteItem) {
        setCanvasState({
            selectedTool: 'create-node',
            nodeAdded: nodeType,
        });
    }

    return (
        <TooltipProvider>
            <div
                className="absolute bottom-[15px] left-1/2 -translate-x-1/2 h-12 bg-white border border-[#ededed] rounded-2xl shadow-sm z-[200] flex items-center px-2"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onPointerMove={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-6">
                    <div className="flex gap-2 items-center">
                        <PaletteItem
                            selected={canvasState.selectedTool === 'pointer'}
                            icon={<MousePointer2 size={20} strokeWidth={1.5}/>}
                            label="Pointer"
                            onClick={() => setCanvasState({selectedTool: 'pointer'})}
                        />
                        <PaletteItem
                            selected={canvasState.selectedTool === 'drag-canvas'}
                            icon={<Hand size={20} strokeWidth={1.5}/>}
                            label="Drag Canvas"
                            onClick={() => setCanvasState({selectedTool: 'drag-canvas'})}
                        />
                        <PaletteItem
                            selected={canvasState.selectedTool === 'free-draw'}
                            icon={<Pencil size={20} strokeWidth={1.5}/>}
                            label="Free Draw"
                            onClick={() => setCanvasState({selectedTool: 'free-draw'})}
                        />

                        <div className="w-px h-6 bg-border"/>

                        {nodeTypes.map((nodeType) => (
                            <PaletteItem
                                key={nodeType.type}
                                selected={canvasState.selectedTool === 'create-node' && canvasState.nodeAdded.type === nodeType.type}
                                icon={nodeType.icon}
                                label={nodeType.label}
                                onClick={() => startCreatingNode(nodeType)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}


export interface PaletteItemProps {
    selected: boolean
    icon: ReactNode;
    label: string;
    onClick: () => void;
}

function PaletteItem({selected, icon, label, onClick}: PaletteItemProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div
                    className={`w-8 h-8 rounded-sm flex items-center justify-center  ${selected ? 'text-white bg-blue-600' : 'text-gray-600'}`}
                    onClick={(event) => {
                        event.stopPropagation();
                        onClick();
                    }}
                >
                    {icon}
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <span>{label}</span>
            </TooltipContent>
        </Tooltip>
    );

}