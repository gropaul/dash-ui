import React from 'react';
import {Column} from "@/model/data-source-connection";
import {ChevronDown, ChevronsUpDown, ChevronUp, Menu} from 'lucide-react';
import {
    ColumnSorting,
    ColumnStats,
    getNextColumnSorting,
    ViewQueryParameters
} from "@/model/relation-state";
import {useDraggable, useDroppable} from "@dnd-kit/core";
import {INITIAL_COLUMN_VIEW_STATE} from "@/model/relation-view-state/table";
import {ColumnStatsProps, ColumnStatsView} from "@/components/relation/table/stats/column-stats-view";
import {RelationViewTableContentProps} from "@/components/relation/table/table-content";
import {ValueIcon} from "@/components/relation/common/value-icon";
import {ColumnHeadResizeHandle} from "@/components/relation/table/table-head/column-head-resize-handler";


export interface ColumnHeadProps extends RelationViewTableContentProps {
    column: Column;
    stats?: ColumnStats;
    onColumnMenuClick?: (column: Column, event: React.MouseEvent) => void;
}


export function TableColumnHead(props: ColumnHeadProps) {

    const {column} = props;

    const tableViewState = props.relationState.viewState.tableState;
    const columnState = tableViewState.columnStates[column.name] ?? INITIAL_COLUMN_VIEW_STATE;

    let columnWidth = columnState.width + 'px';

    const {listeners, setNodeRef: setDraggableNodeRef} = useDraggable({id: column.name});
    const {setNodeRef: setDroppableNodeRef} = useDroppable({id: column.name});

    const queryParameters = props.relationState.query.viewParameters;
    const columnSorting = queryParameters.table.sorting[props.column.name];

    const onlyShowOnHover = !columnSorting;

    const opacityClass = onlyShowOnHover ?
        'hidden group-hover:block opacity-0 group-hover:opacity-100 transition-opacity duration-200' : '';

    const activeSorting = !columnSorting;
    const sortingClass = activeSorting ?
        'text-muted-foreground hover:text-primary' :
        'text-primary';

    function onSortClick() {

        const nextSorting = getNextColumnSorting(columnSorting);


        // check if all columns are still in the relationState
        for (const colName of Object.keys(queryParameters.table.sorting)) {
            const colExists = props.data.columns.find(col => col.name === colName);
            if (!colExists) {
                delete queryParameters.table.sorting[colName];
            }
        }

        const queryParams: ViewQueryParameters = {
            ...queryParameters,
            table: {
                ...queryParameters.table,
                sorting: {
                    ...queryParameters.table.sorting,
                    [props.column.name]: nextSorting,
                },
            }
        }

        props.updateRelationDataWithParams(queryParams);
    }

    return (

        <ColumnHeadWrapper columnWidth={columnWidth} stats={props.stats} relationState={props.relationState}>
            <div
                ref={setDroppableNodeRef}
                className="w-full group flex items-center justify-between pr-6"
            >
                <div
                    ref={setDraggableNodeRef}
                    onClick={onSortClick}
                    className="flex items-center overflow-hidden cursor-pointer"
                    style={{width: columnWidth}}
                    {...listeners}
                >
                    <div style={{minWidth: "16px", display: "flex", alignItems: "center"}}>
                        <ValueIcon type={column.type}/>
                    </div>
                    <div className="ml-2 font-semibold truncate text-nowrap" title={column.name}>
                        {column.name}
                    </div>
                    <div className={`px-1 ${opacityClass} h-4`}>
                        <button className={sortingClass}>
                            <ColumnHeadSortingIcon sorting={columnSorting}/>
                        </button>
                    </div>
                </div>
                <Menu
                    size={16}
                    onClick={(event) => props.onColumnMenuClick?.(column, event)}
                    className="hidden group-hover:block text-muted-foreground hover:text-primary cursor-pointer"
                />
            </div>

            <ColumnHeadResizeHandle
                relationId={props.relationState.id}
                displayState={tableViewState}
                column={column}
                updateRelationViewState={props.updateRelationViewState}

            />
        </ColumnHeadWrapper>


    );
}


function ColumnHeadSortingIcon(props: { sorting?: ColumnSorting, iconSize?: number }) {

    const iconSize = props.iconSize || 16;

    if (props.sorting === 'ASC') {
        return <ChevronUp size={iconSize}/>;
    } else if (props.sorting === 'DESC') {
        return <ChevronDown size={iconSize}/>;
    } else {
        return <ChevronsUpDown size={iconSize}/>;
    }
}

interface ColumnHeadWrapperProps extends ColumnStatsProps {
    columnWidth?: string;
    children?: React.ReactNode;
}

function ColumnHeadWrapper(props: ColumnHeadWrapperProps) {

    return (
        <th
            scope="col"
            style={{width: props.columnWidth, overflow: 'hidden'}}
            className={`p-0 m-0 h-full`}
        >
            <div className="pl-4 py-1.5 border-b flex items-center bg-inherit relative "
                 style={{width: '100%', height: '100%'}}>
                {props.children}
            </div>

            <ColumnStatsView relationState={props.relationState} stats={props.stats} className="h-40 w-full"/>
        </th>
    );
}
