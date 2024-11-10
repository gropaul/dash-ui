import React, {useRef} from 'react';
import {Column} from "@/model/column";
import {
    Hash,
    Text,
    Calendar,
    ToggleLeft,
    CircleHelp,
    Filter,
    ChevronUp,
    ChevronDown,
    ChevronsUpDown
} from 'lucide-react';
import {TableViewState} from "@/components/relation/relation-view";
import {ColumnSorting, getNextColumnSorting, RelationState} from "@/model/relation-state";
import {useRelationsState} from "@/state/relations.state";


interface ColumnHeadProps {
    relation: RelationState;
    column: Column;
    columnIndex: number;
    displayState: TableViewState;
    setDisplayState: (state: TableViewState) => void;
}

export function ColumnHeadIcon(column: Column) {
    const iconSize = 16;
    switch (column.type) {
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
            console.warn(`Unknown column type: ${column.type}`);
            return <CircleHelp size={iconSize}/>;

    }
}


export function TableColumnHead(props: ColumnHeadProps) {
    const {column, columnIndex, displayState, setDisplayState} = props;
    const initialX = useRef<number | null>(null);
    const initialWidth = useRef<number>(displayState.columnStates[columnIndex].width);

    function onMouseMove(event: MouseEvent) {
        if (initialX.current !== null) {
            const deltaX = event.clientX - initialX.current;
            const newStates = {...displayState.columnStates};
            newStates[columnIndex].width = Math.max(initialWidth.current + deltaX, 50); // Set a minimum width of 50px
            setDisplayState({...displayState, columnStates: newStates});
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
        initialWidth.current = displayState.columnStates[columnIndex].width;
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }

    const width = displayState.columnStates[columnIndex].width + "px";

    return (
        <ColumnHeadWrapper columnWidth={width}>
            <div
                className="w-full group flex items-center justify-between pr-6"> {/* Add padding-right to create space */}
                <div className="flex items-center overflow-hidden">
                    <div style={{minWidth: "16px", display: "flex", alignItems: "center"}}>
                        {ColumnHeadIcon(column)}
                    </div>
                    <span
                        className="ml-2 font-semibold flex-grow truncate"
                        style={{whiteSpace: "nowrap"}}
                        title={column.name}
                    >
                {column.name}
            </span>
                </div>
                <ColumnIconButtons {...props}/>
            </div>
            <div
                onMouseDown={onMouseDown}
                className="absolute right-0 top-0 h-full cursor-col-resize w-2 flex justify-center items-center"
                style={{marginRight: "4px"}} // Add margin to separate from icons
            >
                <div className="h-3 w-1 border-l border-gray-700 dark:border-gray-700"/>
            </div>
        </ColumnHeadWrapper>


    );
}

export function ColumnIconButtons(props: ColumnHeadProps) {

    const columnSorting = props.relation.queryParameters.sorting[props.column.name];

    // if there is no sorting only show on hover, else show all the time
    const onlyShowOnHover = !columnSorting;

    const opacityClass = onlyShowOnHover ?
        'opacity-0 group-hover:opacity-100 transition-opacity' : '';

    const activeSorting = !columnSorting;
    const sortingClass = activeSorting ?
        'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200' :
        'text-gray-800 dark:text-gray-200';

    const updateRelation = useRelationsState((state) => state.updateRelationDisplay);

    function onSortClick() {

        const nextSorting = getNextColumnSorting(columnSorting);

        const { [props.column.name]: _, ...remainingSortings } = props.relation.queryParameters.sorting || {};
        const newQueryParams = {
            ...props.relation.queryParameters,
            sorting: {
                [props.column.name]: nextSorting,
                ...remainingSortings,
            },
        };
        updateRelation(props.relation.id, newQueryParams);

    }

    return (
        <div className={`flex items-center space-x-2 flex-shrink-0 ${opacityClass}`}>
            <button className={sortingClass} onClick={onSortClick}>
                <ColumnHeadSortingIcon sorting={columnSorting}/>
            </button>
            <button className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
                <Filter size={16}/>
            </button>
        </div>
    );

}

export function ColumnHeadSortingIcon(props: { sorting?: ColumnSorting, iconSize?: number }) {

    const iconSize = props.iconSize || 16;

    if (props.sorting === 'asc') {
        return <ChevronUp size={iconSize}/>;
    } else if (props.sorting === 'desc') {
        return <ChevronDown size={iconSize}/>;
    } else {
        return <ChevronsUpDown size={iconSize}/>;
    }
}

export function ColumnHeadWrapper(props: {
    columnWidth?: string,
    sticky?: boolean,
    children?: React.ReactNode
}) {
    const sticky = props.sticky ? 'sticky left-0 top-0 h-full' : ' ';
    return (
        <th
            scope="col"
            style={{width: props.columnWidth, overflow: 'hidden'}}
            className={`p-0 m-0 h-8 ${sticky} h-full`}
        >
            <div className="pl-4 border-b border-gray-700 dark:border-gray-700 flex items-center bg-white "
                 style={{width: '100%', height: '100%', position: 'relative'}}>
                {props.children}
            </div>
        </th>
    );
}