import {TableViewState} from "@/components/relation/relation-view";


interface RowElementViewProps {
    element: any,
    index: number,
    displayState: TableViewState
}

export function TableValueCell(props: RowElementViewProps) {
    const columnState = props.displayState.columnStates[props.index];
    const wrapContent = columnState.wrapContent;
    const columnWidth = columnState.width + 'px';
    const element = props.element;

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