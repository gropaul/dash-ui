import {TableColumnHead} from "@/components/relation/table/table-head/table-column-head";
import React from "react";
import {ColumnHeadDropDownMenuContent} from "@/components/relation/table/table-head/dropdown-menu-content";
import {Column} from "@/model/data-source-connection";
import {DropdownMenu, DropdownMenuContent, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {RelationViewTableContentProps} from "@/components/relation/table/table-content";
import {useRelationData} from "@/state/relations-data.state";

export function TableHead(props: RelationViewTableContentProps) {

    const [column, setColumn] = React.useState<Column>(props.data.columns[0]);
    const [menuOpen, setMenuOpen] = React.useState(false);
    const [position, setPosition] = React.useState({ x: 0, y: 0 });

    // Handle the column menu click event
    function onColumnMenuClick(column: Column, event: React.MouseEvent) {
        setColumn(column);
        setMenuOpen(true);

        // Capture mouse position
        setPosition({
            x: event.clientX,
            y: event.clientY,
        });
    }

    const columnNames = props.data.columns.map(col => col.name);

    return (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <thead className="border-0 text-s text-primary bg-inherit sticky top-0 z-[3]">
            <tr className={'bg-inherit'}>
                {/* Row index column header */}
                <th
                    scope="col"
                    className="p-0 m-0 h-8 sticky left-0 z-20 bg-inherit w-20"
                >
                    <div className="w-full h-full bg-inherit absolute right-0 top-0 z-[3] border-r border-b border-border" />
                </th>
                {/* Column headers */}
                {props.columnViewIndices.map((index) => (
                    <DropdownMenuTrigger asChild key={index}>
                        <TableColumnHead
                            {...props}
                            column={props.data.columns[index]}
                            onColumnMenuClick={(column, event) => onColumnMenuClick(column, event)}
                        />
                    </DropdownMenuTrigger>
                ))}
            </tr>
            </thead>
            {/* Dropdown menu content positioned absolutely */}
            {menuOpen && (
                <DropdownMenuContent
                    style={{
                        position: "absolute",
                        left: `calc(${position.x}px - 7rem)`,
                        top: `${position.y}px`,
                        width: "14rem",
                    }}
                >
                    <ColumnHeadDropDownMenuContent
                        {...props}
                        column={column}
                        columnNames={columnNames}
                    />
                </DropdownMenuContent>
            )}
        </DropdownMenu>
    );
}
