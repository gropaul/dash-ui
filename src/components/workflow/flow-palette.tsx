import {
    BarChart3,
    ChartColumnBig,
    Hand,
    Highlighter,
    MousePointer2,
    Pencil,
    PenTool,
    Sheet,
    Text,
    Type
} from 'lucide-react';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import {NodeTemplate} from "@/components/workflow/flow";
import {ReactNode} from "react";
import {
    CanvasState,
    DEFAULT_CHART_SIZE,
    DEFAULT_NODE_SIZE,
    DEFAULT_TEXT_SIZE,
    DrawSettings,
    DrawToolVariant
} from "@/components/workflow/models";

function getToolVariantIcon(variant: DrawToolVariant) {
    switch (variant) {
        case 'pen':
            return <Pencil size={20} strokeWidth={1.5}/>;
        case 'marker':
            return <PenTool size={20} strokeWidth={1.5} className="-rotate-90"/>;
        case 'highlighter':
            return <Highlighter size={20} strokeWidth={1.5}/>;
    }
}
import {FreeDrawToolbar} from "@/components/workflow/free-draw-toolbar";

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
        icon: <ChartColumnBig size={20} strokeWidth={1.5}/>, size: DEFAULT_CHART_SIZE,
        selectAfterCreation: true
    },
];

export function FlowPalette({setCanvasState, canvasState}: NodePaletteProps) {
    const {drawSettings} = canvasState;

    function startCreatingNode(nodeType: NodePaletteItem) {
        setCanvasState({
            selectedTool: 'create-node',
            nodeAdded: nodeType,
            drawSettings,
        });
    }

    function updateDrawSettings(settings: DrawSettings) {
        setCanvasState({
            ...canvasState,
            drawSettings: settings,
        });
    }

    return (
        <TooltipProvider>
            {canvasState.selectedTool === 'free-draw' && (
                <FreeDrawToolbar
                    settings={drawSettings}
                    onSettingsChange={updateDrawSettings}
                />
            )}
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
                            onClick={() => setCanvasState({selectedTool: 'pointer', drawSettings})}
                        />
                        <PaletteItem
                            selected={canvasState.selectedTool === 'drag-canvas'}
                            icon={<Hand size={20} strokeWidth={1.5}/>}
                            label="Drag Canvas"
                            onClick={() => setCanvasState({selectedTool: 'drag-canvas', drawSettings})}
                        />
                        <PaletteItem
                            selected={canvasState.selectedTool === 'free-draw'}
                            icon={getToolVariantIcon(drawSettings.toolVariant)}
                            label="Free Draw"
                            onClick={() => setCanvasState({selectedTool: 'free-draw', drawSettings})}
                        />
                        <PaletteItem
                            selected={canvasState.selectedTool === 'create-text'}
                            icon={<Type size={20} strokeWidth={1.5}/>}
                            label="Text"
                            onClick={() => setCanvasState({selectedTool: 'create-text', drawSettings})}
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