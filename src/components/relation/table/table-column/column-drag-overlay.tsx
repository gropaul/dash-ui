import {DragOverlay} from "@dnd-kit/core";
import {Move} from "lucide-react";
import React from "react";

interface TableColumnDragOverlayProps {
    activeId: string | number | null;
}

export function ColumnDragOverlay({activeId}: TableColumnDragOverlayProps) {
    return(
        <DragOverlay>
            {activeId ? (
                <div
                    className="flex items-center overflow-hidden z-10 p-1 pl-2 pr-2 rounded-s
                    border border-gray-300 dark:border-gray-700
                    bg-white bg-opacity-90 dark:bg-black w-fit "
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
    )
}