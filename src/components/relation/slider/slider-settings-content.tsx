"use client"

import {H5, Muted} from "@/components/ui/typography"
import {Separator} from "@/components/ui/separator"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {ScrollArea} from "@/components/ui/scroll-area"
import {RelationViewContentProps} from "@/components/relation/relation-view-content"
import {Toggle} from "@/components/ui/toggle"
import {SliderMode} from "@/model/relation-view-state/slider"
import {isNumeric} from "@/model/relation-view-state/column-utils"
import {ViewManager} from "@/model/relation-state/relation-view"
import {getRelationActions} from "@/state/relations/actions/end-user-actions"
import {ColumnSelector} from "@/components/relation/chart/chart-config/column-selector"
import {AxisConfig, getInitialAxisDecoration} from "@/model/relation-view-state/chart"

function deriveDefaultStep(min: number, max: number): number {
    if (Number.isInteger(min) && Number.isInteger(max)) return 1;
    const rawStep = (max - min) / 100;
    return Math.pow(10, Math.round(Math.log10(rawStep)));
}

const MODES: { value: SliderMode; label: string }[] = [
    {value: 'eq', label: '='},
    {value: 'lower', label: '≤'},
    {value: 'higher', label: '≥'},
    {value: 'in_range', label: 'In range'},
    {value: 'out_range', label: 'Out range'},
];

export function SliderSettingsContent(props: RelationViewContentProps) {
    const {relationState, data} = props;
    const actions = getRelationActions(props);
    const params = ViewManager.instance.slider.getQueryParameters(relationState);

    const minVal = data.rows.length === 1 ? Number(data.rows[0][0]) : undefined;
    const maxVal = data.rows.length === 1 ? Number(data.rows[0][1]) : undefined;
    const defaultStep = (minVal !== undefined && maxVal !== undefined && !isNaN(minVal) && !isNaN(maxVal))
        ? deriveDefaultStep(minVal, maxVal)
        : 1;

    const numericColumns = relationState.viewState.schema.filter(isNumeric);

    // Bridge: slider stores column by name; ColumnSelector uses AxisConfig with columnId (id === name in schema)
    const currentColumn = numericColumns.find(col => col.name === params.column);
    const axis: AxisConfig | undefined = currentColumn
        ? {columnId: currentColumn.id, label: currentColumn.name, decoration: getInitialAxisDecoration(0)}
        : undefined;

    async function updateColumn(update: Partial<AxisConfig>) {
        if (!update.columnId) return;
        await props.updateRelationDataWithParams({
            ...relationState.query.viewParameters,
            slider: {...params, column: update.columnId},
        });
    }

    function setMode(mode: SliderMode) {
        actions.updateRelationQueryParams({slider: {mode}});
    }

    function updateStep(value: string) {
        const num = parseFloat(value);
        if (!isNaN(num) && num > 0) {
            actions.updateRelationQueryParams({slider: {step: num}});
        }
    }

    const currentMode = params.mode ?? 'eq';

    return (
        <div className="relative flex h-full min-h-0 flex-col gap-2 overflow-hidden">
            <div className="pb-1 shrink-0 mr-3">
                <H5>Slider Config</H5>
                <Separator/>
            </div>

            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full w-full pr-3">
                    <div className="flex min-h-full flex-col gap-3 p-0.5">

                        {/* Column picker */}
                        <Label className="h-3">
                            <Muted>Column</Muted>
                        </Label>
                        {numericColumns.length === 0 ? (
                            <Muted>No numeric columns available</Muted>
                        ) : (
                            <ColumnSelector
                                plotType="bar"
                                axisType="slider"
                                axis={axis}
                                columns={numericColumns}
                                updateAxis={updateColumn}
                            />
                        )}

                        <Separator/>

                        {/* Mode picker */}
                        <Label className="h-3">
                            <Muted>Mode</Muted>
                        </Label>
                        <div className="flex flex-col gap-1 w-full">
                            <div className="grid grid-cols-3 gap-1 w-full">
                                {MODES.slice(0, 3).map(({value, label}) => (
                                    <Toggle
                                        key={value}
                                        variant="outline"
                                        size="sm"
                                        pressed={currentMode === value}
                                        onPressedChange={() => setMode(value)}
                                        className="w-full text-xs"
                                    >
                                        {label}
                                    </Toggle>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-1 w-full">
                                {MODES.slice(3).map(({value, label}) => (
                                    <Toggle
                                        key={value}
                                        variant="outline"
                                        size="sm"
                                        pressed={currentMode === value}
                                        onPressedChange={() => setMode(value)}
                                        className="w-full text-xs"
                                    >
                                        {label}
                                    </Toggle>
                                ))}
                            </div>
                        </div>

                        <Separator/>

                        {/* Step size */}
                        <Label className="h-3">
                            <Muted>Step</Muted>
                        </Label>
                        <Input
                            type="number"
                            min={0.001}
                            step="any"
                            value={params.step ?? defaultStep}
                            onChange={(e) => updateStep(e.target.value)}
                            className="h-8"
                        />

                        <div className="h-8"/>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
