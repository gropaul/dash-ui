import {RelationDisplayState} from "@/components/relation/relation-view";


interface RowElementViewProps {
    element: any,
    index: number,
    displayState: RelationDisplayState
}

export function ValueCellView(props: RowElementViewProps) {
    const columnState = props.displayState.columnStates[props.index];
    const wrapContent = columnState.wrapContent;
    const columnWidth = columnState.width + 'px';
    const element = props.element;

    return (
        <td
            className="px-4 py-1"
            style={{
                width: columnWidth,
                overflow: 'hidden',
                whiteSpace: wrapContent ? 'normal' : 'nowrap',
                textOverflow: 'ellipsis',
            }}
            title={element.toString()}
        >
            {element.toString()}
        </td>
    );
}