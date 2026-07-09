import {ArrowDown, ArrowUp, ArrowUpDown} from 'lucide-react';
import {ColumnSorting} from "@/model/relation-state/relation-view-table";

/**
 * Tri-state sort indicator shared by the relation table column headers and the
 * folder-view table: up when ascending, down when descending, and the neutral
 * up/down glyph when the column is not the active sort.
 */
export function ColumnHeadSortingIcon(props: { sorting?: ColumnSorting, iconSize?: number, className?: string }) {

    const iconSize = props.iconSize || 16;

    if (props.sorting === 'ASC') {
        return <ArrowUp size={iconSize} className={props.className}/>;
    } else if (props.sorting === 'DESC') {
        return <ArrowDown size={iconSize} className={props.className}/>;
    } else {
        return <ArrowUpDown size={iconSize} className={props.className}/>;
    }
}
