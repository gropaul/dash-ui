import React from 'react';
import {Column} from "@/model/data-source-connection";
import {Menu} from 'lucide-react';
import {ColumnHeadSortingIcon} from "@/components/basics/column-head-sorting-icon";
import {
    RelationStats,
    RelationQueryParameters
} from "@/model/relation-state";
import {useSortable} from "@dnd-kit/sortable";
import {INITIAL_COLUMN_VIEW_STATE} from "@/model/relation-view-state/table";
import {ColumnStatsProps, ColumnStatsView} from "@/components/relation/table/table-head/stats/column-stats-view";
import {RelationViewTableContentProps} from "@/components/relation/table/table-content";
import {ValueIcon} from "@/components/relation/common/value-icon";
import {ColumnHeadResizeHandle} from "@/components/relation/table/table-head/column-head-resize-handler";
import {ColumnFilterIn, ColumnSorting} from "@/model/relation-state/relation-view-table";


export interface ColumnHeadProps extends RelationViewTableContentProps {
    column: Column;
    relationStats?: RelationStats;
    onColumnMenuClick?: (column: Column, event: React.MouseEvent) => void;
    columnIndex: number;
    isLast: boolean;
}

export function getNextColumnSorting(current?: ColumnSorting): ColumnSorting | undefined {
    switch (current) {
        case 'ASC':
            return 'DESC';
        case 'DESC':
            return undefined;
        case undefined:
            return 'ASC';
    }
}


export function TableColumnHead(props: ColumnHeadProps) {

    const {column} = props;

    const tableViewState = props.relationState.viewState.tableState;
    const columnState = tableViewState.columnStates[column.name] ?? INITIAL_COLUMN_VIEW_STATE;

    function UpdateColumnWidthGlobalState(newWidth: number) {
        const newStates = {...tableViewState.columnStates};
        if (!newStates[column.name]) {
            newStates[column.name] = {...INITIAL_COLUMN_VIEW_STATE};
        }
        newStates[column.name].width = newWidth;
        props.updateRelationViewState({
            tableState: {
                ...tableViewState,
                columnStates: newStates,
            },
        });
    }

    let localColumnWidth = columnState.width;
    let columnWidthString = localColumnWidth.toString() + 'px';

    const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id: column.name});

    // The sortable node is the <th> itself (see ColumnHeadWrapper). We translate
    // (not full transform) so the cell slides in place without squishing. No
    // DragOverlay: a position:fixed overlay is offset by transformed ancestors
    // (react-grid-layout items, the xyflow viewport), so it lands far from the
    // pointer on the dashboard/canvas. Moving the cell in place is transform-safe.
    const dragStyle: React.CSSProperties = {
        transform: transform
            ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
            : undefined,
        transition,
        opacity: isDragging ? 0.8 : 1,
        position: 'relative',
        zIndex: isDragging ? 1 : 0,
    };

    const queryParameters = props.relationState.query.viewParameters;
    const columnSorting = queryParameters.table.sorting[props.column.name];

    // Position of this column within a multi-column sort (1-based). Order follows the
    // insertion order of the sorting record, matching the sort config panel. Only shown
    // when more than one column is sorted.
    const activeSorts = Object.entries(queryParameters.table.sorting).filter(([, dir]) => dir !== undefined);
    const sortIndex = columnSorting && activeSorts.length > 1
        ? activeSorts.findIndex(([name]) => name === props.column.name) + 1
        : undefined;

    const onlyShowOnHover = !columnSorting;

    const opacityClass = onlyShowOnHover ?
        'hidden group-hover:block opacity-0 group-hover:opacity-100 transition-opacity duration-200' : '';

    const activeSorting = !columnSorting;
    const sortingClass = activeSorting ?
        'text-muted-foreground hover:text-indigo-600' :
        'text-indigo-600';

    function onSortClick() {

        const nextSorting = getNextColumnSorting(columnSorting);


        // check if all columns are still in the relationState
        for (const colName of Object.keys(queryParameters.table.sorting)) {
            const colExists = props.data.columns.find(col => col.name === colName);
            if (!colExists) {
                delete queryParameters.table.sorting[colName];
            }
        }

        const queryParams: RelationQueryParameters = {
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

    function onSelectedChange(selected: string[]) {

        const newFilter: ColumnFilterIn =  {
            type: "values",
            values: selected,
        }

        const filterCopy = {...queryParameters.table.filters}

        if (selected.length > 0) {
            filterCopy[props.column.name] = newFilter;
        } else {
            delete filterCopy[props.column.name];
        }

        const queryParams: RelationQueryParameters = {
            ...queryParameters,
            table: {
                ...queryParameters.table,
                filters: filterCopy
            }
        }
        props.updateRelationDataWithParams(queryParams);
    }

    return (

        <ColumnHeadWrapper
            columnIndex={props.columnIndex}
            columnWidth={columnWidthString}
            relationStats={props.relationStats}
            relationState={props.relationState}
            onSelectedChange={onSelectedChange}
            thRef={setNodeRef}
            thStyle={dragStyle}
        >
            <div
                className="w-full group flex items-center justify-between pr-6"
            >
                <div
                    onClick={onSortClick}
                    className="flex items-center overflow-hidden cursor-pointer touch-none nodrag nopan"
                    style={{width: localColumnWidth}}
                    {...attributes}
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
                            <ColumnHeadSortingIcon sorting={columnSorting} index={sortIndex}/>
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
                currentWidth={localColumnWidth}
                updateColumnWidth={UpdateColumnWidthGlobalState}
                isLastColumn={props.isLast}
            />
        </ColumnHeadWrapper>


    );
}


interface ColumnHeadWrapperProps extends ColumnStatsProps {
    columnWidth?: string;
    children?: React.ReactNode;
    thRef?: (node: HTMLElement | null) => void;
    thStyle?: React.CSSProperties;
}

function ColumnHeadWrapper(props: ColumnHeadWrapperProps) {

    return (
        <th
            ref={props.thRef}
            scope="col"
            style={{width: props.columnWidth, overflow: 'hidden', ...props.thStyle}}
            className={`p-0 m-0 h-full`}
        >
            <div className="pl-4 py-1.5 border-b flex items-center bg-inherit relative "
                 style={{width: '100%', height: '100%'}}>
                {props.children}
            </div>

            <ColumnStatsView
                onSelectedChange={props.onSelectedChange}
                columnIndex={props.columnIndex}
                relationState={props.relationState}
                relationStats={props.relationStats}
                className="h-40 w-full"
            />
        </th>
    );
}
