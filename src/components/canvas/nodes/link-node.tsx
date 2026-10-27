import {NodeProps, NodeResizer, NodeToolbar, Position, useReactFlow} from '@xyflow/react';
import {useRef} from 'react';
import {ExternalLink, Trash2} from "lucide-react";
import {Button, buttonVariants} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Toggle} from "@/components/ui/toggle";
import {cn} from "@/lib/utils";
import {useCanvasState} from "@/components/canvas/canvas-context";
import {GRID_SIZE} from "@/components/canvas/logic/models";
import {DEFAULT_LINK_NODE_DATA, LinkNodeData} from "@/components/canvas/nodes/node-data";

// A press that moved further than this was a drag, not a click.
const CLICK_DISTANCE = 4;

/** A button on the canvas that opens a link, e.g. a call to action. */
export function LinkNode({id, data, selected}: NodeProps) {
    const {label, href, variant} = {...DEFAULT_LINK_NODE_DATA, ...(data as Partial<LinkNodeData>)};
    const pressedAt = useRef<{ x: number, y: number } | null>(null);

    return (
        <div className="h-full w-full">
            <LinkToolbar nodeId={id} isVisible={selected ?? false} data={{label, href, variant}}/>
            <NodeResizer lineClassName="z-40" isVisible={selected} minWidth={3 * GRID_SIZE} minHeight={2 * GRID_SIZE}/>
            <a href={href}
               target="_blank"
               rel="noopener noreferrer"
               className={cn(buttonVariants({variant: variant === 'primary' ? 'default' : 'outline', size: 'lg'}), "h-full w-full gap-2 rounded-xl text-base")}
               onPointerDown={e => pressedAt.current = {x: e.clientX, y: e.clientY}}
               onClick={e => {
                   const from = pressedAt.current;
                   if (from && Math.hypot(e.clientX - from.x, e.clientY - from.y) > CLICK_DISTANCE) e.preventDefault();
               }}>
                {label}
                <ExternalLink className="h-4 w-4 opacity-70"/>
            </a>
        </div>
    );
}

function LinkToolbar({nodeId, isVisible, data}: { nodeId: string, isVisible: boolean, data: LinkNodeData }) {
    const {deleteElements} = useReactFlow();
    const {setNodes} = useCanvasState();

    const update = (updates: Partial<LinkNodeData>) => setNodes((nodes) =>
        nodes.map((node) => node.id === nodeId ? {...node, data: {...node.data, ...updates}} : node));

    return (
        <NodeToolbar isVisible={isVisible} position={Position.Top} align="center">
            <div className="nodrag flex flex-row items-center gap-1 rounded-2xl border bg-background p-1 shadow-sm">
                <Button className="h-8 w-8 rounded-xl" variant="ghost" size="icon" aria-label="Delete"
                        onClick={() => deleteElements({nodes: [{id: nodeId}]})}>
                    <Trash2 className="h-4 w-4"/>
                </Button>
                <Input className="h-8 w-36" aria-label="Label" value={data.label} onChange={e => update({label: e.target.value})}/>
                <Input className="h-8 w-56" aria-label="Link" value={data.href} onChange={e => update({href: e.target.value})}/>
                <Toggle className="h-8 rounded-xl px-3 text-xs" pressed={data.variant === 'primary'}
                        onPressedChange={pressed => update({variant: pressed ? 'primary' : 'outline'})}>
                    Filled
                </Toggle>
            </div>
        </NodeToolbar>
    );
}
