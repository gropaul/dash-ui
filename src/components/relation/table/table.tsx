import {RelationState} from "@/model/relation-state";
import {TableContent} from "@/components/relation/table/table-content";
import {TableFooter} from "@/components/relation/table/table-footer";
import {DndContext, DragOverlay} from "@dnd-kit/core";
import type {DragStartEvent} from "@dnd-kit/core/dist/types";
import {Move} from "lucide-react";
import React, {useState} from "react";
import {TableViewState} from "@/model/relation-view-state/table";
import {RelationViewState} from "@/model/relation-view-state";


export interface RelationViewTableProps {
    relationState: RelationState;
    setRelationViewState: (state: RelationViewState) => void;

}

export function Table(props: RelationViewTableProps) {

    const relationState = props.relationState;

    function setTableState(state: TableViewState) {
        props.setRelationViewState({
            ...relationState.viewState,
            tableState: state,
        });
    }

    const [activeId, setActiveId] = useState<string | number | null>(null);

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id);
    }

    function handleDragEnd() {
        setActiveId(null);
    }

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

            <div className="flex flex-col w-full h-full">
                <div className="relative overflow-y-auto flex-1 flex flex-row">
                    <TableContent
                        relation={relationState}
                        setDisplayState={setTableState}
                    />
                </div>
                <TableFooter relation={relationState}/>
            </div>
            <DragOverlay>
                {activeId ? (
                    <div
                        className="flex items-center overflow-hidden z-10 bg-white p-1 border border-gray-300 dark:border-gray-700"
                        style={{width: 192}}
                    >
                        <div style={{minWidth: "16px", display: "flex", alignItems: "center"}}>
                            <Move size={16}/>
                        </div>
                        <span
                            className="ml-2 font-semibold text-gray-700 dark:bg-black dark:text-gray-400"
                            title={activeId.toString()}
                            style={{fontSize: "14px"}}
                        >
                            {activeId}
                        </span>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}