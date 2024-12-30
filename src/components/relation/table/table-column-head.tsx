import React from 'react';
import {Column} from "@/model/column";
import {ChevronDown, ChevronsUpDown, ChevronUp} from 'lucide-react';
import {ColumnSorting, getNextColumnSorting} from "@/model/relation-state";
import {useRelationsState} from "@/state/relations.state";
import {useDraggable, useDroppable} from "@dnd-kit/core";
import {INITIAL_COLUMN_VIEW_STATE} from "@/model/relation-view-state/table";
import {shallow} from "zustand/shallow";
import {ValueIcon} from "@/components/relation/common/value-icon";
import {ColumnHeadResizeHandle} from "@/components/relation/table/table-column-head/resize-handler";
import {ColumnHeadDropDownMenu} from "@/components/relation/table/table-column-head/dropdown-menu";


export interface ColumnHeadProps {
    column: Column;
    relationId: string;
}


export function TableColumnHead(props: ColumnHeadProps) {

    const {column} = props;

    const displayState = useRelationsState((state) => state.getRelationViewState(props.relationId).tableState, shallow);
    const columnState = useRelationsState((state) => state.getRelationViewState(props.relationId).tableState.columnStates[column.name], shallow) ?? INITIAL_COLUMN_VIEW_STATE;

    let columnWidth = columnState.width + 'px';

    const {listeners, setNodeRef: setDraggableNodeRef} = useDraggable({id: column.name});
    const {setNodeRef: setDroppableNodeRef} = useDroppable({id: column.name});

    const queryParameters = useRelationsState((state) => state.getRelation(props.relationId)?.query.viewParameters, shallow);
    const columnSorting = queryParameters.sorting[props.column.name];

    const onlyShowOnHover = !columnSorting;

    const opacityClass = onlyShowOnHover ?
        'hidden group-hover:block opacity-0 group-hover:opacity-100 transition-opacity duration-200' : '';

    const activeSorting = !columnSorting;
    const sortingClass = activeSorting ?
        'text-muted-foreground hover:text-primary' :
        'text-primary';

    const updateRelation = useRelationsState((state) => state.updateRelationDataWithParams);

    function onSortClick() {

        const nextSorting = getNextColumnSorting(columnSorting);

        const {[props.column.name]: _, ...remainingSortings} = queryParameters.sorting || {};
        const newQueryParams = {
            ...queryParameters,
            sorting: {
                [props.column.name]: nextSorting,
                ...remainingSortings,
            },
        };
        updateRelation(props.relationId, newQueryParams);
    }

    return (
        <ColumnHeadWrapper columnWidth={columnWidth}>
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
                <ColumnHeadDropDownMenu {...props} />
            </div>

            <ColumnHeadResizeHandle
                relationId={props.relationId}
                displayState={displayState}
                column={column}
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

function ColumnHeadWrapper(props: { columnWidth?: string, children?: React.ReactNode }) {
    return (
        <th
            scope="col"
            style={{width: props.columnWidth, overflow: 'hidden'}}
            className={`p-0 m-0 h-full`}
        >
            <div className="pl-4 border-b border-border flex items-center bg-background "
                 style={{width: '100%', height: '100%', position: 'relative'}}>
                {props.children}
            </div>
        </th>
    );
}
