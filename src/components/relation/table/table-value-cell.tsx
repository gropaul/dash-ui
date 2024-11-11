import {INITIAL_COLUMN_VIEW_STATE, TableViewState} from "@/components/relation/relation-view";
import {Column} from "@/model/column";


interface RowElementViewProps {
    element: any,
    column: Column,
    displayState: TableViewState
}

export function TableValueCell({column, displayState, element}: RowElementViewProps) {
    const columnViewState = displayState.columnStates?.[column.name] ?? INITIAL_COLUMN_VIEW_STATE;
    const wrapContent = columnViewState.wrapContent;
    const columnWidth = columnViewState.width + 'px';

    let stringElement: string;
    try {
        if (element === null || element === undefined) {
            stringElement = 'null';
        } else {
            stringElement = element.toString();
        }
    } catch (e) {
        stringElement = 'Error';
        console.error('Error converting element to string', element, e);
    }

    return (
        <td
            className="px-4 py-1"
            style={{
                width: columnWidth,
                overflow: 'hidden',
                whiteSpace: wrapContent ? 'normal' : 'nowrap',
                textOverflow: 'ellipsis',
            }}
            title={stringElement}
        >
            {stringElement}
        </td>
    );
}