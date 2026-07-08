import {TableColumnHead} from "@/components/relation/table/table-head/table-column-head";
import React from "react";
import {ColumnDropDownContent} from "@/components/relation/table/table-column/column-dropdown-content";
import {Column} from "@/model/data-source-connection";
import {DropdownMenu, DropdownMenuContent} from "@/components/ui/dropdown-menu";
import {fontMono, RelationViewTableContentProps} from "@/components/relation/table/table-content";
import {useRelationDataState} from "@/state/relations-data.state";
import {cn} from "@/lib/utils";
import {SortableContext, horizontalListSortingStrategy} from "@dnd-kit/sortable";

export function TableHead(props: RelationViewTableContentProps) {
    const [selectedColumn, setSelectedColumn] = React.useState<Column | null>(null);
    const [columnMenuOpen, setColumnMenuOpen] = React.useState(false);
    const [columnMenuPosition, setColumnMenuPosition] = React.useState({x: 0, y: 0});
    const relationStats = useRelationDataState(state => state.getStats(props.relationState.id));
    const showIndexColumn = props.relationState.viewState.tableState.showIndexColumn ?? true;

    function handleColumnMenuClick(column: Column, event: React.MouseEvent) {
        setSelectedColumn(column);
        setColumnMenuPosition({x: event.clientX, y: event.clientY});
        setColumnMenuOpen(true);
    }

    return (
        <>
            <thead className={cn(fontMono.className, "border-0 text-s text-primary bg-primary-foreground sticky top-0 z-[3]")}>
            <tr className="bg-inherit">
                {/* Row index / settings column header */}
                {showIndexColumn && (
                    <th
                        scope="col"
                        className="p-0 m-0 h-fit sticky left-0 z-20 bg-inherit w-20"
                    >
                        <div className={'absolute top-0 h-full w-full border-b border-r pointer-events-none'}>
                        </div>
                    </th>
                )}

                {/* Column headers */}
                <SortableContext
                    items={props.columnViewIndices.map(index => props.data.columns[index].name)}
                    strategy={horizontalListSortingStrategy}
                >
                    {props.columnViewIndices.map((index) => (
                        <TableColumnHead
                            key={index}
                            {...props}
                            relationStats={relationStats}
                            column={props.data.columns[index]}
                            columnIndex={index}
                            onColumnMenuClick={handleColumnMenuClick}
                            isLast={index === props.columnViewIndices[props.columnViewIndices.length - 1]}
                        />
                    ))}
                </SortableContext>
            </tr>
            </thead>

            {/* Column dropdown menu - positioned absolutely based on click location */}
            <DropdownMenu open={columnMenuOpen} onOpenChange={setColumnMenuOpen}>

                <DropdownMenuContent
                    style={{
                        position: "fixed",
                        left: columnMenuPosition.x - 112,
                        top: columnMenuPosition.y,
                        width: "14rem",
                    }}
                >
                    {selectedColumn && (
                        <ColumnDropDownContent
                            {...props}
                            column={selectedColumn}
                            columnIndex={0 /* not used in content */}
                            isLast={false}
                        />
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}