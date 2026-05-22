"use client"

import React from 'react';
import {ChartInteractionMode, ChartQueryParameters, ChartQueryState} from "@/model/relation-state/relation-view-chart";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {BoxSelect, MousePointer2, MoveHorizontal, MoveVertical, X} from "lucide-react";
import {cn} from "@/lib/utils";
import {EndUserRelationActions} from "@/state/relations/actions/end-user-actions";

export const INTERACTION_MODES: {
    value: ChartInteractionMode;
    label: string;
    icon: React.ReactNode;
    cartesianOnly: boolean;
}[] = [
    {value: 'click', label: 'Click to filter', icon: <MousePointer2 className="h-3.5 w-3.5"/>, cartesianOnly: false},
    // {value: 'x-range', label: 'X-axis range', icon: <MoveHorizontal className="h-3.5 w-3.5"/>, cartesianOnly: true},
    // {value: 'y-range', label: 'Y-axis range', icon: <MoveVertical className="h-3.5 w-3.5"/>, cartesianOnly: true},
    // {value: 'box', label: 'Box selection', icon: <BoxSelect className="h-3.5 w-3.5"/>, cartesianOnly: true},
];

export function isBrushMode(mode: ChartInteractionMode): boolean {
    return mode === 'x-range' || mode === 'y-range' || mode === 'box';
}

export function brushTypeForMode(mode: ChartInteractionMode): string | false {
    if (mode === 'x-range') return 'lineX';
    if (mode === 'y-range') return 'lineY';
    if (mode === 'box') return 'rect';
    return false;
}

export interface ModeToolbarProps {
    config: ChartQueryParameters | undefined;
    queryState: ChartQueryState;
    isCartesian: boolean;
    actions: Pick<EndUserRelationActions, 'updateRelationQueryParams' | 'updateRelationQueryState'>;
    echartRef: React.RefObject<any>;
}

export function ModeToolbar({config, queryState, isCartesian, actions, echartRef}: ModeToolbarProps) {

    const interactionMode = config?.interactionMode ?? 'none';
    const availableModes = INTERACTION_MODES.filter(m => !m.cartesianOnly || isCartesian);
    const hasSelection =
        (interactionMode === 'click' && (queryState.selectedXValues?.length ?? 0) > 0) ||
        (isBrushMode(interactionMode) &&
            (queryState.xRangeStart !== undefined || queryState.yRangeStart !== undefined || (queryState.xCategories?.length ?? 0) > 0));

    function resetToNone() {
        if (!config) return;
        actions.updateRelationQueryParams({chart: {...config, interactionMode: 'none'}});
        // Must set chart to undefined (not {}) — safeDeepUpdate merges objects and can't clear existing keys
        actions.updateRelationQueryState({chart: undefined as any});
        const instance = echartRef.current?.getEchartsInstance?.();
        if (instance) instance.dispatchAction({type: 'brush', areas: []});
    }

    function onModeChange(value: string) {
        if (!config) return;
        // Clicking the active toggle deselects it — treat as cancel
        if (!value || value === 'none') {
            resetToNone();
            return;
        }
        actions.updateRelationQueryParams({chart: {...config, interactionMode: value as ChartInteractionMode}});
    }

    return (
        <div className="flex-none flex items-center justify-end px-2 py-0.5 gap-2">
            <TooltipProvider>
                {hasSelection && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                className="h-6 w-6 flex items-center justify-center rounded bg-background text-muted-foreground hover:text-foreground transition-colors"
                                onClick={resetToNone}
                            >
                                <X className="h-3.5 w-3.5"/>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Clear selection</TooltipContent>
                    </Tooltip>
                )}
                <ToggleGroup
                    type="single"
                    size="sm"
                    value={interactionMode}
                    onValueChange={onModeChange}
                    className="gap-0.5"
                >
                    {/*{availableModes.map(m => (*/}
                    {/*    <Tooltip key={m.value}>*/}
                    {/*        <TooltipTrigger asChild>*/}
                    {/*            <ToggleGroupItem*/}
                    {/*                value={m.value}*/}
                    {/*                className={cn(*/}
                    {/*                    "h-6 w-6 p-0",*/}
                    {/*                    m.value === interactionMode || true &&*/}
                    {/*                    "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"*/}
                    {/*                )}*/}
                    {/*            >*/}
                    {/*                {m.icon}*/}
                    {/*            </ToggleGroupItem>*/}
                    {/*        </TooltipTrigger>*/}
                    {/*        <TooltipContent side="bottom">{m.label}</TooltipContent>*/}
                    {/*    </Tooltip>*/}
                    {/*))}*/}
                </ToggleGroup>
            </TooltipProvider>
        </div>
    );
}
