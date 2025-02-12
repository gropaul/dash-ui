import {DndContext, DragOverlay, PointerSensor, useSensor, useSensors} from "@dnd-kit/core";
import React, {ReactNode, useState} from "react";
import type {DragEndEvent, DragStartEvent} from "@dnd-kit/core/dist/types";
import {findNodesInTrees, TreeAction, TreeNode} from "@/components/basics/files/tree-utils";
import {useRelationsState} from "@/state/relations.state";
import {cn} from "@/lib/utils";


export interface TreeDndContextProps {
    enabled: boolean;
    children: ReactNode;
    tree: TreeNode[];
    selectedIds?: string[][];
    iconFactory: (type: string) => React.ReactNode;
}

export function TreeDndContext(props: TreeDndContextProps) {

    const applyEditorElementsActions = useRelationsState((state) => state.applyEditorElementsActions);
    const [dragActive, setDragActive] = useState<boolean | null>(null);
    const [lastTarget, setLastTarget] = useState<string[] | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5 // Minimum distance in pixels before dragging starts
            }
        })
    );

    function handleDragStart(event: DragStartEvent) {
        setDragActive(true);
    }

    function handleDragEnd(event: DragEndEvent) {

        const over = event.over;

        if (!over) {
            setDragActive(null);
            return;
        }

        const path = over.data.current?.path;
        const canHaveChildren = over.data.current?.canHaveChildren;

        // if these variables are null or selectedIds is null, return
        if (!path || !props.selectedIds) {
            return;
        }

        // either take the targets parent path if it cant have children or the target path if it can
        const target = canHaveChildren ? path : path.slice(0, -1);
        setLastTarget(target);

        const actions: TreeAction[] = props.selectedIds.map((selectedId) => {
            return {
                type: 'move',
                id_path: selectedId,
                target_id_path: target
            }
        });
        applyEditorElementsActions(actions);
        setDragActive(null);
    }


    if (!props.enabled) {
        return props.children;
    }

    const paths = props.selectedIds ?? [];
    const tree = findNodesInTrees(props.tree, paths);
    const treeFiltered = tree.filter((node) => node !== undefined) as TreeNode[];

    let depths: number[];
    if (!dragActive && lastTarget) {
        depths = paths.map((path) => lastTarget.length);
    } else {
        depths = paths.map((path) => path.length);
    }

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

            {props.children}
            <DragOverlay
                adjustScale={false}
                dropAnimation={{
                    duration: 300,
                    sideEffects: ({active, dragOverlay}) => {
                        // 'dragOverlay.node' is the element, or you can do it in state
                        const nestedElement = dragOverlay.node.children[0].children[0] as HTMLElement;
                        nestedElement.style.paddingLeft = lastTarget ? `${(lastTarget.length + 1) * 1.5}rem` : '0';
                        // add a transition that fades out the element
                        nestedElement.style.opacity = '0';
                        nestedElement.style.transition =
                            // property duration timing-function [delay]
                            'padding-left 0.3s cubic-bezier(0.18, 0.67, 0.6, 1.22), ' +
                            'opacity 0.15s cubic-bezier(0.18, 0.67, 0.6, 1.22) 0.15s';
                    },
                }}
            >
                {dragActive && (
                    <div>
                        {treeFiltered.map((node, i) => (
                            <div
                                key={i}
                                className={cn('flex flex-row items-center w-fit h-fit')}
                                style={{paddingLeft: `${depths[i] * 1.5}rem`}}
                            >
                                <div
                                    className="flex-shrink-0 flex items-center"
                                    style={{width: '1.5rem'}}
                                >
                                    {props.iconFactory(node.type)}
                                </div>
                                <span>{node.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    );
}