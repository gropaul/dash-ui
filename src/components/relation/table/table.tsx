import {TableContent} from "@/components/relation/table/table-content";
import {TableFooter} from "@/components/relation/table/table-footer";
import {DndContext, DragOverEvent, PointerSensor, useSensor, useSensors} from "@dnd-kit/core";
import type {DragEndEvent, DragStartEvent} from "@dnd-kit/core/dist/types";
import React, {useState} from "react";
import {getTableColumnViewIndices, TableViewState} from "@/model/relation-view-state/table";
import {TableColumnDragOverlay} from "@/components/relation/table/table-column-drag-overlay";
import {useRelationsState} from "@/state/relations.state";
import {shallow} from "zustand/shallow";


export interface RelationViewTableProps {
    relationId: string;
}

export function Table(props: RelationViewTableProps) {
    const relationState = useRelationsState((state) => state.getRelation(props.relationId), shallow);
    const setRelationViewState = useRelationsState((state) => state.updateRelationViewState);
    const relationData = relationState.data;
    const columnsOrder = relationState.viewState.tableState.columnsOrder;

    const [dragStartOrder, setDragStartOrder] = useState<string[]>([]);
    const [activeId, setActiveId] = useState<string | number | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5 // Minimum distance in pixels before dragging starts
            }
        })
    );


    // if there is no data, return null
    if (!relationData) {
        return null;
    }

    function setTableState(state: TableViewState) {
        setRelationViewState(
            props.relationId, {
                tableState: state,
            });
    }

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id);
        setDragStartOrder(columnsOrder);
    }

    function handleDragEnd(_event: DragEndEvent) {
        setActiveId(null);
    }

    function onDragOver(event: DragOverEvent) {
        const over = event.over;

        if (!over) {
            return;
        }

        const target = over.id as string;
        const active = activeId as string;

        if (active === target) {
            // the order is the start order
            setTableState({
                ...relationState.viewState.tableState,
                columnsOrder: dragStartOrder,
            });
        } else {
            const targetIndex = dragStartOrder.indexOf(target);
            const activeIndex = dragStartOrder.indexOf(active);

            const newColumnsOrder = [...dragStartOrder];
            // remove the active column
            newColumnsOrder.splice(activeIndex, 1);

            // insert the active column before the target column
            newColumnsOrder.splice(targetIndex, 0, active);

            setTableState({
                ...relationState.viewState.tableState,
                columnsOrder: newColumnsOrder,
            });
        }
    }

    const columnViewIndices = getTableColumnViewIndices(relationState.viewState.tableState, relationData);

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={onDragOver}>
            <div className="flex flex-col w-full h-full overflow-hidden">
                <div className="relative overflow-y-auto flex-1 flex flex-row">
                    <TableContent
                        columnViewIndices={columnViewIndices}
                        relation={relationState}
                    />
                </div>
                <TableFooter relation={relationState}/>
            </div>
            <TableColumnDragOverlay activeId={activeId}/>
        </DndContext>
    )
}