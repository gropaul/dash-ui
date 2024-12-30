import { TableColumnHead } from "@/components/relation/table/table-head/table-column-head";
import React from "react";
import { RelationData } from "@/model/relation";
import { ColumnHeadDropDownMenuContent } from "@/components/relation/table/table-head/dropdown-menu-content";
import { Column } from "@/model/column";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export interface TableHeadProps {
    relationId: string;
    relationData: RelationData;
    columnViewIndices: number[];
}

export function TableHead(props: TableHeadProps) {
    const [column, setColumn] = React.useState<Column>(props.relationData.columns[0]);
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

    return (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <thead className="border-0 text-s text-primary bg-background sticky top-0 z-20">
            <tr>
                {/* Row index column header */}
                <th
                    scope="col"
                    className="p-0 m-0 h-8 sticky left-0 z-20 bg-background w-20"
                >
                    <div className="w-full h-full absolute right-0 top-0 z-50 border-r border-b border-border" />
                </th>
                {/* Column headers */}
                {props.columnViewIndices.map((index) => (
                    <DropdownMenuTrigger asChild key={index}>
                        <TableColumnHead
                            relationId={props.relationId}
                            column={props.relationData.columns[index]}
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
                        relationId={props.relationId}
                        column={column}
                    />
                </DropdownMenuContent>
            )}
        </DropdownMenu>
    );
}
