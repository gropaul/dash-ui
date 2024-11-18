import {RelationState} from "@/model/relation-state";
import {TableContent} from "@/components/relation/table/table-content";
import {TableFooter} from "@/components/relation/table/table-footer";
import {DndContext, DragMoveEvent, DragOverEvent, DragOverlay} from "@dnd-kit/core";
import type {DragEndEvent, DragStartEvent} from "@dnd-kit/core/dist/types";
import {Move} from "lucide-react";
import React, {useState} from "react";
import {getTableColumnViewIndices, TableViewState} from "@/model/relation-view-state/table";
import {RelationViewState} from "@/model/relation-view-state";
import {TableColumnDragOverlay} from "@/components/relation/table/table-column-drag-overlay";
import {useRelationsState} from "@/state/relations.state";


export interface RelationViewTableProps {
    relationId: string;
}

export function Table(props: RelationViewTableProps) {

    const relationState = useRelationsState((state) => state.getRelation(props.relationId));
    const setRelationViewState = useRelationsState((state) => state.updateRelationViewState);

    const columnsOrder = relationState.viewState.tableState.columnsOrder;

    const [dragStartOrder, setDragStartOrder] = useState<string[]>([]);

    function setTableState(state: TableViewState) {
        setRelationViewState(
            props.relationId, {
                ...relationState.viewState,
                tableState: state,
            });
    }

    const [activeId, setActiveId] = useState<string | number | null>(null);

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id);
        setDragStartOrder(columnsOrder);
    }

    function handleDragEnd(event: DragEndEvent) {
        setActiveId(null);
    }

    function onDragOver(event: DragOverEvent) {
        const over = event.over;

        if (!over) {
            return;
        }

        console.log(over);

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

    const columnViewIndices = getTableColumnViewIndices(relationState);

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={onDragOver}>
            <div className="flex flex-col w-full h-full">
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