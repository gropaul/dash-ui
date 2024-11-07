import React, {useRef} from 'react';
import {Column} from "@/model/column";
import {Hash, Text, Calendar, ToggleLeft, CircleHelp} from 'lucide-react';
import {RelationTableViewState} from "@/components/relation/relation-view";

interface ColumnHeadProps {
    column: Column;
    columnIndex: number;
    displayState: RelationTableViewState;
    setDisplayState: (state: RelationTableViewState) => void;
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

export function ColumnHead(props: ColumnHeadProps) {
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
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    function onMouseDown(event: React.MouseEvent) {
        event.preventDefault(); // Prevent text selection

        initialX.current = event.clientX;
        initialWidth.current = displayState.columnStates[columnIndex].width;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    const width = displayState.columnStates[columnIndex].width + 'px';
    return (
        <ColumnHeadWrapper columnWidth={width}>
            <div style={{minWidth: '16px', display: 'flex', alignItems: 'center'}}>
                {ColumnHeadIcon(column)}
            </div>
            <span
                className="ml-2 font-semibold"
                style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}
                title={column.name}
            >
                    {column.name}
                </span>
            <div className={`w-8`}/>
            <div
                onMouseDown={onMouseDown}
                className="absolute right-0 top-0 h-full cursor-col-resize w-2 flex justify-center items-center"
            >
                <div className="h-3 w-1 border-l border-gray-700 dark:border-gray-700"/>
            </div>
        </ColumnHeadWrapper>
    );
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
            className={`p-0 m-0 h-8 ${sticky}`}
        >
            <div className="pl-4 border-b border-gray-700 dark:border-gray-700 flex items-center bg-white "
                 style={{width: '100%', height: '100%', position: 'relative'}}>
                {props.children}
            </div>
        </th>
    );
}