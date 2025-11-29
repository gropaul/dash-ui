import {TableColumnHead} from "@/components/relation/table/table-head/table-column-head";
import React from "react";
import {ColumnDropDownContent} from "@/components/relation/table/settings/column-dropdown-content";
import {Column} from "@/model/data-source-connection";
import {
    DropdownMenu,
    DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {RelationViewTableContentProps} from "@/components/relation/table/table-content";
import {useRelationDataState} from "@/state/relations-data.state";
import {GetStatForColumn} from "@/model/relation-state";
import {ChevronRight, Settings} from "lucide-react";
import {TableDropDownContent} from "@/components/relation/table/settings/table-dropdown-content";
import {ContentSelectColumns} from "@/components/relation/table/settings/content-select-columns";

export function TableHead(props: RelationViewTableContentProps) {
    const [selectedColumn, setSelectedColumn] = React.useState<Column | null>(null);
    const [columnMenuOpen, setColumnMenuOpen] = React.useState(false);
    const [columnMenuPosition, setColumnMenuPosition] = React.useState({x: 0, y: 0});
    const relationStats = useRelationDataState(state => state.getStats(props.relationState.id));

    const columnNames = props.data.columns.map(col => col.name);

    function handleColumnMenuClick(column: Column, event: React.MouseEvent) {
        setSelectedColumn(column);
        setColumnMenuPosition({x: event.clientX, y: event.clientY});
        setColumnMenuOpen(true);
    }

    return (
        <>
            <thead className="border-0 text-s text-primary bg-inherit sticky top-0 z-[3]">
            <tr className="bg-inherit">
                {/* Row index / settings column header */}
                <th
                    scope="col"
                    className="p-0 m-0 h-fit sticky left-0 z-20 bg-inherit w-20"
                >
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div
                                className="flex items-center justify-center absolute top-[1px] h-8 border-b border-r w-20 hover:bg-accent/50"
                            >
                                <Settings className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer"/>
                            </div>
                        </DropdownMenuTrigger>

                        <TableDropDownContent {...props} columnNames={columnNames}/>
                    </DropdownMenu>
                    <div className={'absolute top-0 h-full w-full border-b border-r pointer-events-none'}>

                    </div>
                </th>

                {/* Column headers */}
                {props.columnViewIndices.map((index) => (
                    <TableColumnHead
                        key={index}
                        {...props}
                        relationStats={relationStats}
                        column={props.data.columns[index]}
                        columnIndex={index}
                        onColumnMenuClick={handleColumnMenuClick}
                    />
                ))}
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
                            columnNames={columnNames}
                            columnIndex={0 /* not used in content */}
                        />
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}