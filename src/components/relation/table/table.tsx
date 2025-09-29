import {TableContent} from "@/components/relation/table/table-content";
import {TableFooter} from "@/components/relation/table/table-footer";
import {DndContext, DragOverEvent, PointerSensor, useSensor, useSensors} from "@dnd-kit/core";
import type {DragEndEvent, DragStartEvent} from "@dnd-kit/core/dist/types";
import React, {useState} from "react";
import {getTableColumnViewIndices, TableViewState} from "@/model/relation-view-state/table";
import {TableColumnDragOverlay} from "@/components/relation/table/table-column-drag-overlay";
import {RelationViewProps} from "@/components/relation/relation-view";
import {cn} from "@/lib/utils";
import {useRelationData} from "@/state/relations-data.state";
import {RelationData} from "@/model/relation";
import {RelationViewContentProps} from "@/components/relation/relation-view-content";


export function Table(props: RelationViewContentProps) {
    const data = props.data;
    const columnsOrder = props.relationState.viewState.tableState.columnsOrder;

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
    if (!data) {
        return null;
    }

    function setTableState(state: TableViewState) {
        props.updateRelationViewState({
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
                ...props.relationState.viewState.tableState,
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
                ...props.relationState.viewState.tableState,
                columnsOrder: newColumnsOrder,
            });
        }
    }

    const columnViewIndices = getTableColumnViewIndices(props.relationState.viewState.tableState, data);

    const isEmbedded = props.embedded ?? false;
    // will the whole height of the screen when not embedded, todo: maybe make max height configurable
    const wrapperClasses = isEmbedded ? 'h-fit max-h-96' : 'h-full';
    const contentClasses = isEmbedded ? 'overflow-y-auto' : 'flex-1 overflow-y-auto ';

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={onDragOver}>
            <div className={cn("flex bg-inherit flex-col w-full overflow-hidden", wrapperClasses)}>
                <div className={cn("bg-inherit flex flex-row", contentClasses)}>
                    <TableContent {...props} columnViewIndices={columnViewIndices} data={data}/>
                </div>
                <TableFooter {...props}/>
            </div>
            <TableColumnDragOverlay activeId={activeId}/>
        </DndContext>
    )
}