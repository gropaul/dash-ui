import React from "react";
import {ColumnHeadProps} from "@/components/relation/table/table-head/table-column-head";
import {ConnectionsService} from "@/state/connections/connections-service";
import {splitSQL, turnQueryIntoSubquery} from "@/platform/sql-utils";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Checkbox} from "@/components/ui/checkbox";
import {DropdownMenuItem} from "@/components/ui/dropdown-menu";
import {ScrollArea} from "@/components/ui/scroll-area";
import {ColumnFilter, ViewQueryParameters} from "@/model/relation-state";

type Mode = 'loading' | 'range' | 'values' | 'none';

export function ColumnFilterMenu(props: ColumnHeadProps) {

    const [mode, setMode] = React.useState<Mode>('loading');
    const [distinctValues, setDistinctValues] = React.useState<any[]>([]);
    const [selectedValues, setSelectedValues] = React.useState<Set<any>>(new Set());
    const [min, setMin] = React.useState<number | undefined>(undefined);
    const [max, setMax] = React.useState<number | undefined>(undefined);
    const activeFilter = props.relationState.query.viewParameters.table.filters[props.column.name];

    React.useEffect(() => {
        loadMeta();
        // prefill from active filter
        if (activeFilter?.type === 'values') {
            setSelectedValues(new Set(activeFilter.values));
        } else if (activeFilter?.type === 'range') {
            setMin(activeFilter.min);
            setMax(activeFilter.max);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.column.name]);

    async function loadMeta() {
        try {
            const base = props.relationState.query.baseQuery;
            const statements = splitSQL(base);
            const finalQuery = statements[statements.length - 1];
            const subquery = turnQueryIntoSubquery(finalQuery, 'subq');
            const conn = ConnectionsService.getInstance();

            const countRes = await conn.executeQuery(`SELECT COUNT(DISTINCT "${props.column.name}") FROM ${subquery};`);
            const count = Number(countRes.rows[0][0]);
            if (count <= 50) {
                const valuesRes = await conn.executeQuery(`SELECT DISTINCT "${props.column.name}" FROM ${subquery} LIMIT 50;`);
                setDistinctValues(valuesRes.rows.map((r: any[]) => r[0]));
                setMode('values');
            } else if (props.column.type === 'Integer' || props.column.type === 'Float') {
                const rangeRes = await conn.executeQuery(`SELECT MIN("${props.column.name}"), MAX("${props.column.name}") FROM ${subquery};`);
                setMin(rangeRes.rows[0][0]);
                setMax(rangeRes.rows[0][1]);
                setMode('range');
            } else {
                setMode('none');
            }
        } catch (e) {
            setMode('none');
        }
    }

    function applyFilter() {
        const queryParameters = props.relationState.query.viewParameters;
        let filter: ColumnFilter | undefined;
        if (mode === 'range') {
            filter = { type: 'range', min, max };
        } else if (mode === 'values') {
            filter = { type: 'values', values: Array.from(selectedValues) };
        }
        if (!filter) return;
        const newFilters = {
            ...(queryParameters.table.filters || {}),
            [props.column.name]: filter,
        };
        const newParams: ViewQueryParameters = {
            ...queryParameters,
            table: {
                ...queryParameters.table,
                offset: 0,
                filters: newFilters,
            },
        };
        props.updateRelationDataWithParams(newParams);
    }

    function clearFilter() {
        const queryParameters = props.relationState.query.viewParameters;
        const { [props.column.name]: _, ...remaining } = queryParameters.table.filters || {};
        const newParams: ViewQueryParameters = {
            ...queryParameters,
            table: {
                ...queryParameters.table,
                offset: 0,
                filters: remaining,
            },
        };
        props.updateRelationDataWithParams(newParams);
        setSelectedValues(new Set());
    }

    if (mode === 'loading') {
        return <div className="p-2 text-sm">Loading...</div>;
    }

    if (mode === 'none') {
        return <div className="p-2 text-sm">No filter available</div>;
    }

    if (mode === 'range') {
        return (
            <div className="flex flex-col space-y-2 p-2 w-52">
                <Input
                    type="number"
                    value={min ?? ''}
                    onChange={(e) => setMin(e.target.value === '' ? undefined : Number(e.target.value))}
                    placeholder="min"
                />
                <Input
                    type="number"
                    value={max ?? ''}
                    onChange={(e) => setMax(e.target.value === '' ? undefined : Number(e.target.value))}
                    placeholder="max"
                />
                <div className="flex space-x-2 pt-1">
                    <DropdownMenuItem asChild onSelect={(e) => { e.preventDefault(); applyFilter(); }}>
                        <Button className="h-6 flex-1">Apply</Button>
                    </DropdownMenuItem>
                    {activeFilter && (
                        <DropdownMenuItem asChild onSelect={(e) => { e.preventDefault(); clearFilter(); }}>
                            <Button variant="outline" className="h-6 flex-1">Clear</Button>
                        </DropdownMenuItem>
                    )}
                </div>
            </div>
        );
    }

    // mode === 'values'
    return (
        <div className="p-2 w-52">
            <ScrollArea className="h-56 pr-2">
                {distinctValues.map((v) => (
                    <div key={String(v)} className="flex items-center space-x-2 py-1">
                        <Checkbox
                            checked={selectedValues.has(v)}
                            onCheckedChange={(checked) => {
                                const copy = new Set(selectedValues);
                                if (checked) {
                                    copy.add(v);
                                } else {
                                    copy.delete(v);
                                }
                                setSelectedValues(copy);
                            }}
                        />
                        <span className="text-sm truncate" title={String(v)}>{String(v)}</span>
                    </div>
                ))}
            </ScrollArea>
            <div className="flex space-x-2 pt-1">
                <DropdownMenuItem asChild onSelect={(e) => { e.preventDefault(); applyFilter(); }}>
                    <Button className="h-6 flex-1">Apply</Button>
                </DropdownMenuItem>
                {activeFilter && (
                    <DropdownMenuItem asChild onSelect={(e) => { e.preventDefault(); clearFilter(); }}>
                        <Button variant="outline" className="h-6 flex-1">Clear</Button>
                    </DropdownMenuItem>
                )}
            </div>
        </div>
    );
}
