import {TableColumnHead} from "@/components/relation/table/table-head/table-column-head";
import React, {useEffect} from "react";
import {ColumnHeadDropDownMenuContent} from "@/components/relation/table/table-head/dropdown-menu-content";
import {Column} from "@/model/data-source-connection";
import {DropdownMenu, DropdownMenuContent, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {RelationViewTableContentProps} from "@/components/relation/table/table-content";
import { useRelationDataState} from "@/state/relations-data.state";
import {GetStatForColumn} from "@/model/relation-state";
import {ChevronDown, ChevronsDownUp, Settings} from "lucide-react";

export function TableHead(props: RelationViewTableContentProps) {

    const [column, setColumn] = React.useState<Column>(props.data.columns[0]);
    const [menuOpen, setMenuOpen] = React.useState(false);
    const [position, setPosition] = React.useState({ x: 0, y: 0 });
    const relationStats = useRelationDataState(state => state.getStats(props.relationState.id))

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
                    {/* Existing layers */}
                    <div className="w-full h-full absolute right-0 top-0 z-[3] border-r border-b border-border" />
                    <div className="w-full h-8 bg-inherit absolute right-0 top-[1px] z-[3] border-r border-b border-border" />

                    {/* Centered icon */}
                    <div className="w-full h-8 absolute left-0 top-0 z-[5] flex items-center justify-center pointer-events-none">
                        <Settings className="w-4 h-4 text-muted-foreground " />
                    </div>
                    {/*<div className="w-full mt-8 h-full flex items-center justify-center relative z-[4]">*/}
                    {/*    <ChevronsDownUp className="w-4 h-4 text-muted-foreground " />*/}
                    {/*</div>*/}

                </th>

                {/* Column headers */}
                {props.columnViewIndices.map((index) => (
                    <DropdownMenuTrigger asChild key={index}>
                        <TableColumnHead
                            {...props}
                            column={props.data.columns[index]}
                            stats={GetStatForColumn(index, relationStats)}
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
