import {Column} from "@/model/column";
import {INITIAL_COLUMN_VIEW_STATE, TableViewState} from "@/model/relation-view-state/table";
import {useRelationsState} from "@/state/relations.state";
import {shallow} from "zustand/shallow";


interface RowElementViewProps {
    relationId: string,
    element: any,
    column: Column,
}

export function TableValueCell({relationId, column, element}: RowElementViewProps) {
    const columnViewState = useRelationsState((state) => state.getRelationViewState(relationId).tableState.columnStates[column.name], shallow);
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