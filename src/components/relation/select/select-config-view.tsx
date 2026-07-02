"use client"

import {Muted} from "@/components/ui/typography"
import {Separator} from "@/components/ui/separator"
import {Label} from "@/components/ui/label"
import {Switch} from "@/components/ui/switch"
import {RelationViewContentProps} from "@/components/relation/relation-view-content"
import {ViewManager} from "@/model/relation-state/relation-view"
import {ColumnSelector} from "@/components/relation/chart/chart-config/column-selector"
import {AxisConfig, getInitialAxisDecoration} from "@/model/relation-view-state/chart"

export function SelectConfigView(props: RelationViewContentProps) {
    const {relationState} = props;
    const params = ViewManager.instance.select.getQueryParameters(relationState);

    const columns = relationState.viewState.schema;

    // Bridge: select stores column by name; ColumnSelector uses AxisConfig.columnId (id === name in schema)
    const currentColumn = columns.find(col => col.name === params.column);
    const axis: AxisConfig | undefined = currentColumn
        ? {columnId: currentColumn.id, label: currentColumn.name, decoration: getInitialAxisDecoration(0)}
        : undefined;

    async function updateColumn(update: Partial<AxisConfig>) {
        if (!update.columnId) return;
        await props.updateRelationDataWithParams({
            ...relationState.query.viewParameters,
            select: {...params, column: update.columnId},
        });
    }

    function setMultiSelect(multiSelect: boolean) {
        props.updateRelationQueryParams({select: {...params, multiSelect}});
    }

    return (
        <div className="flex flex-col gap-3">

                        {/* Column picker */}
                        <Label className="h-3">
                            <Muted>Column</Muted>
                        </Label>
                        {columns.length === 0 ? (
                            <Muted>No columns available</Muted>
                        ) : (
                            <ColumnSelector
                                plotType="bar"
                                axisType="select"
                                axis={axis}
                                columns={columns}
                                updateAxis={updateColumn}
                            />
                        )}

                        <Separator/>

                        {/* Multi-select toggle */}
                        <div className="flex items-center justify-between">
                            <Label>
                                <Muted>Multi Select</Muted>
                            </Label>
                            <Switch
                                checked={params.multiSelect ?? false}
                                onCheckedChange={setMultiSelect}
                            />
                        </div>

                        <div className="h-8"/>
        </div>
    );
}
