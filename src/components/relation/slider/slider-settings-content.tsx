"use client"

import {H5, Muted} from "@/components/ui/typography"
import {Separator} from "@/components/ui/separator"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {ScrollArea} from "@/components/ui/scroll-area"
import {RelationViewContentProps} from "@/components/relation/relation-view-content"
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group"
import {Check} from "lucide-react"
import {cn} from "@/lib/utils"
import {ValueIcon} from "@/components/relation/common/value-icon"
import {SliderMode} from "@/model/relation-view-state/slider"
import {isNumeric} from "@/model/relation-view-state/column-utils"
import {ViewManager} from "@/model/relation-state/relation-view"
import {getRelationActions} from "@/state/relations/actions/end-user-actions"

function deriveDefaultStep(min: number, max: number): number {
    if (Number.isInteger(min) && Number.isInteger(max)) return 1;
    const rawStep = (max - min) / 100;
    return Math.pow(10, Math.round(Math.log10(rawStep)));
}

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

    function setColumn(columnName: string) {
        actions.updateRelationQueryParams({slider: {column: columnName}});
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
                        <div className="flex flex-col gap-1">
                            {numericColumns.length === 0 ? (
                                <Muted>No numeric columns available</Muted>
                            ) : (
                                numericColumns.map(col => (
                                    <button
                                        key={col.id}
                                        className={cn(
                                            "flex items-center gap-2 px-2 py-1.5 rounded text-sm w-full text-left",
                                            "hover:bg-accent transition-colors",
                                            params.column === col.name ? "bg-accent" : "bg-transparent"
                                        )}
                                        onClick={() => setColumn(col.name)}
                                    >
                                        <div className="w-4 h-4 flex items-center justify-center">
                                            {params.column === col.name && <Check className="w-3 h-3 text-primary"/>}
                                        </div>
                                        <ValueIcon size={14} type={col.type}/>
                                        <span>{col.name}</span>
                                    </button>
                                ))
                            )}
                        </div>

                        <Separator/>

                        {/* Mode picker */}
                        <Label className="h-3">
                            <Muted>Mode</Muted>
                        </Label>
                        <ToggleGroup
                            type="single"
                            value={params.mode ?? 'eq'}
                            onValueChange={(v) => v && setMode(v as SliderMode)}
                            className="justify-start flex-wrap"
                        >
                            <ToggleGroupItem value="eq" className="text-xs">=</ToggleGroupItem>
                            <ToggleGroupItem value="lower" className="text-xs">&lt;=</ToggleGroupItem>
                            <ToggleGroupItem value="higher" className="text-xs">&gt;=</ToggleGroupItem>
                            <ToggleGroupItem value="in_range" className="text-xs">In range</ToggleGroupItem>
                            <ToggleGroupItem value="out_range" className="text-xs">Out range</ToggleGroupItem>
                        </ToggleGroup>

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
