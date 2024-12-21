import React, {useRef} from 'react';
import {Column} from "@/model/column";
import {Calendar, ChevronDown, ChevronsUpDown, ChevronUp, CircleHelp, Hash, Text, ToggleLeft} from 'lucide-react';
import {ColumnSorting, getNextColumnSorting} from "@/model/relation-state";
import {useRelationsState} from "@/state/relations.state";
import {useDraggable, useDroppable} from "@dnd-kit/core";
import {INITIAL_COLUMN_VIEW_STATE, TableViewState} from "@/model/relation-view-state/table";
import {shallow} from "zustand/shallow";
import {ValueType} from "@/model/value-type";


interface ColumnHeadProps {
    column: Column;
    relationId: string;
}


export function TableColumnHead(props: ColumnHeadProps) {

    const displayState = useRelationsState((state) => state.getRelationViewState(props.relationId).tableState, shallow);

    const {column} = props;

    const columnState = useRelationsState((state) => state.getRelationViewState(props.relationId).tableState.columnStates[column.name], shallow) ?? INITIAL_COLUMN_VIEW_STATE;
    let columnWidth = columnState.width + 'px';

    const {listeners, setNodeRef: setDraggableNodeRef} = useDraggable({id: column.name,});
    const {setNodeRef: setDroppableNodeRef} = useDroppable({id: column.name});

    return (
        <ColumnHeadWrapper columnWidth={columnWidth}>
            <div
                ref={setDroppableNodeRef}
                className="w-full group flex items-center justify-between pr-6"
            >
                <div
                    ref={setDraggableNodeRef}
                    className="flex items-center overflow-hidden"
                    style={{width: columnWidth}}
                    {...listeners}
                >
                    <div style={{minWidth: "16px", display: "flex", alignItems: "center"}}>
                        {<ColumnIcon type={column.type}/>}
                    </div>
                    <span className="ml-2 font-semibold flex-grow truncate text-nowrap" title={column.name}>
                    {column.name}
                </span>
                </div>
                <ColumnIconButtons {...props} />
            </div>

            <ColumnHeadResizeHandle
                relationId={props.relationId}
                displayState={displayState}
                column={column}
            />
        </ColumnHeadWrapper>
    );
}


export function ColumnIcon({type, size}: { type: ValueType, size?: number }) {
    const iconSize = size || 16;
    switch (type) {
        case 'Integer':
            return <Hash size={iconSize}/>;
        case 'Float':
            return <Hash size={iconSize}/>;
        case 'String':
            return <Text size={iconSize}/>;
        case 'Boolean':
            return <ToggleLeft size={iconSize}/>;
        case 'Timestamp':
            return <Calendar size={iconSize}/>;
        default:
            console.warn(`Unknown column type: ${type}`);
            return <CircleHelp size={iconSize}/>;

    }
}

function ColumnIconButtons(props: ColumnHeadProps) {

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
        <div className={`flex items-center space-x-2 flex-shrink-0 ${opacityClass} h-4`}>
            <button className={sortingClass} onClick={onSortClick}>
                <ColumnHeadSortingIcon sorting={columnSorting}/>
            </button>
        </div>
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

interface ColumnHeadResizeHandleProps {
    relationId: string;
    displayState: TableViewState;
    column: Column;
}

function ColumnHeadResizeHandle({relationId, displayState, column}: ColumnHeadResizeHandleProps) {

    const initialX = useRef<number | null>(null);
    const columnViewState = displayState.columnStates[column.name] ?? INITIAL_COLUMN_VIEW_STATE;
    const widthRef = useRef<number>(columnViewState.width);

    const updateViewState = useRelationsState((state) => state.updateRelationViewState);

    function onMouseMove(event: MouseEvent) {
        if (initialX.current !== null) {
            const deltaX = event.clientX - initialX.current;
            const newStates = {...displayState.columnStates};

            if (!newStates[column.name]) {
                newStates[column.name] = {...INITIAL_COLUMN_VIEW_STATE};
            }

            newStates[column.name].width = Math.max(widthRef.current + deltaX, 50); // Set a minimum width of 50px

            updateViewState(relationId, {
                tableState: {
                    ...displayState,
                    columnStates: newStates,
                },
            });
        }
    }

    function onMouseUp() {
        initialX.current = null;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
    }

    function onMouseDown(event: React.MouseEvent) {
        event.preventDefault(); // Prevent text selection
        initialX.current = event.clientX;
        widthRef.current = (displayState.columnStates[column.name] ?? INITIAL_COLUMN_VIEW_STATE).width;
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }

    return (
        <div
            onMouseDown={onMouseDown}
            className="absolute right-0 top-0 h-full cursor-col-resize w-2 flex justify-center items-center"
            style={{marginRight: "4px"}} // Add margin to separate from icons
        >
            <div className="h-3 w-1 border-l border-gray-700 dark:border-gray-700"/>
        </div>
    );
}