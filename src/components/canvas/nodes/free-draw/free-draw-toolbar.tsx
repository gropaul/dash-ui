import {NodeToolbar, Position, useReactFlow} from '@xyflow/react';
import {Button} from "@/components/ui/button";
import {Trash2} from "lucide-react";
import {ColorPalette} from "@/components/ui/color-palette";
import {FreeDrawNodeData} from "../free-draw-node";

interface FreeDrawToolbarProps {
    nodeId: string;
    isVisible: boolean;
    data: FreeDrawNodeData;
}

export function FreeDrawToolbar({nodeId, isVisible, data}: FreeDrawToolbarProps) {
    const {setNodes, deleteElements} = useReactFlow();

    const updateNodeData = (updates: Partial<FreeDrawNodeData>) => {
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

    return (
        <NodeToolbar isVisible={isVisible} position={Position.Top} align="center">
            <div className="flex flex-row items-center bg-background border rounded-2xl shadow-sm pr-2">
                <Button
                    className="rounded-[0px] rounded-l-2xl w-10 h-10"
                    variant="ghost"
                    size="icon"
                    onClick={handleDelete}
                >
                    <Trash2 className="h-4 w-4"/>
                </Button>
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
