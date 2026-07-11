import {ArrowDown, ArrowUp, ArrowUpDown} from 'lucide-react';
import {cn} from "@/lib/utils";
import {ColumnSorting} from "@/model/relation-state/relation-view-table";

/**
 * Tri-state sort indicator shared by the relation table column headers and the
 * folder-view table: up when ascending, down when descending, and the neutral
 * up/down glyph when the column is not the active sort.
 *
 * Styling lives here: an active (sorted) column shows an indigo arrow; an inactive
 * column shows a muted glyph that fades in on hover of the enclosing `group` (the
 * column-header button). Pass `className` only to override/extend.
 *
 * For multi-column sorts, pass `index` (1-based) to show the column's position in the
 * sort order next to the arrow; it renders only while the column is actively sorted.
 */
export function ColumnHeadSortingIcon(props: { sorting?: ColumnSorting, iconSize?: number, className?: string, index?: number }) {

    const iconSize = props.iconSize || 16;
    const active = props.sorting !== undefined;
    const className = cn(
        active
            ? "text-indigo-600"
            : "text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200",
        props.className,
    );

    // With an index, wrap the arrow + position number in one inline-flex span so they share
    // the icon's color. Without one, return the bare icon (unchanged for old callers).
    if (active && props.index !== undefined) {
        const Arrow = props.sorting === 'ASC' ? ArrowUp : ArrowDown;
        return (
            <span className={cn("inline-flex items-center gap-0.5", className)}>
                <Arrow size={iconSize}/>
                <span className="text-xs font-mono">{props.index}</span>
            </span>
        );
    }

    if (props.sorting === 'ASC') {
        return <ArrowUp size={iconSize} className={className}/>;
    } else if (props.sorting === 'DESC') {
        return <ArrowDown size={iconSize} className={className}/>;
    } else {
        return <ArrowUpDown size={iconSize} className={className}/>;
    }
}
