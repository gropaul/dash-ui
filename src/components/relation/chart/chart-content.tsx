"use client"

import {RelationData} from "@/model/relation";

import React, {useEffect, useMemo, useRef} from 'react';
import ReactECharts from 'echarts-for-react';
import {EChartsOption} from "echarts-for-react/src/types";
import {toEChartOptions, plotIsCartesian} from "@/components/relation/chart/echart-utils";
import {RelationViewContentProps} from "@/components/relation/relation-view-content";
import {ViewManager} from "@/model/relation-state/relation-view";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";
import {ChartInteractionMode, ChartQueryState} from "@/model/relation-state/relation-view-chart";
import {ModeToolbar, isBrushMode, brushTypeForMode} from "@/components/relation/chart/chart-content/mode-toolbar";

export interface MyChartProps extends RelationViewContentProps {
    hideTitleIfEmpty?: boolean,
}

const BRUSH_DEBOUNCE_MS = 300;

export function ChartContent(props: MyChartProps) {
    const {relationState, data} = props;
    const config = ViewManager.instance.chart.getQueryParameters(props.relationState);
    const containerRef = useRef<HTMLDivElement>(null);
    const [textColor, setTextColor] = React.useState<string>('#333');
    const echartRef = useRef<any>(null);

    // Debounce refs for brush selection
    const brushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingBrushRef = useRef<ChartQueryState | null>(null);

    const actions = getRelationActions(props);
    const queryState = ViewManager.instance.chart.getQueryState(relationState);
    const interactionMode = config?.interactionMode ?? 'none';
    const isCartesian = config ? plotIsCartesian(config.plot) : false;

    // Keep refs up to date so stable event handlers always see current values
    const interactionModeRef = useRef(interactionMode);
    const queryStateRef = useRef(queryState);
    const configRef = useRef(config);
    const dataRef = useRef(data);
    const actionsRef = useRef(actions);
    interactionModeRef.current = interactionMode;
    queryStateRef.current = queryState;
    configRef.current = config;
    dataRef.current = data;
    actionsRef.current = actions;

    useEffect(() => {
        if (containerRef.current) {
            const color = getComputedStyle(containerRef.current).getPropertyValue('color').trim();
            if (color) setTextColor(color);
        }
    });

    // Clean up debounce timer on unmount
    useEffect(() => {
        return () => {
            if (brushTimerRef.current !== null) clearTimeout(brushTimerRef.current);
        };
    }, []);

    // Activate / deactivate brush cursor when interaction mode changes
    useEffect(() => {
        if (!echartRef.current) return;
        const instance = echartRef.current.getEchartsInstance?.();
        if (!instance) return;

        const bt = brushTypeForMode(interactionMode);
        if (bt) {
            instance.dispatchAction({
                type: 'takeGlobalCursor',
                key: 'brush',
                brushOption: {brushType: bt, brushMode: 'single'},
            });
        } else {
            instance.dispatchAction({type: 'takeGlobalCursor', key: 'brush', brushOption: {brushType: false}});
            instance.dispatchAction({type: 'brush', areas: []});
        }
    }, [interactionMode]);

    const option: EChartsOption = config ? toEChartOptions(config, data, textColor, interactionMode, queryState) : {};

    // Stable handler object — created once, reads current values via refs at call time
    const onEvents = useMemo<Record<string, (p: any) => void>>(() => ({
        click: (p: any) => {
            if (interactionModeRef.current !== 'click') return;
            let xVal: any;
            if (Array.isArray(p.data?.value)) {
                // Cartesian: value is [x, y], preserves original type
                xVal = p.data.value[0];
            } else {
                // Pie: p.name is always stringified by ECharts — look up the original typed value by index
                const labelColId = configRef.current?.plot?.pie?.axis?.label?.columnId;
                if (labelColId !== undefined && p.dataIndex !== undefined) {
                    const data = dataRef.current;
                    const labelColIdx = data.columns.findIndex(c => c.id === labelColId);
                    if (labelColIdx !== -1) xVal = data.rows[p.dataIndex]?.[labelColIdx];
                }
                xVal = xVal ?? p.name;
            }
            const current = queryStateRef.current.selectedXValues ?? [];
            const isSelected = current.includes(xVal);
            const next = isSelected ? current.filter(v => v !== xVal) : [...current, xVal];
            actionsRef.current.updateRelationQueryState({chart: {selectedXValues: next}});
        },
        brushSelected: (brushEvent: any) => {
            const mode = interactionModeRef.current;
            if (!isBrushMode(mode)) return;
            const cfg = configRef.current;
            pendingBrushRef.current = extractBrushState(
                brushEvent, dataRef.current,
                cfg?.plot?.cartesian?.xAxis?.columnId,
                cfg?.plot?.cartesian?.yAxes?.map(a => a.columnId),
                mode
            );
            if (brushTimerRef.current !== null) clearTimeout(brushTimerRef.current);
            brushTimerRef.current = setTimeout(() => {
                if (pendingBrushRef.current !== null) {
                    actionsRef.current.updateRelationQueryState({chart: pendingBrushRef.current});
                    pendingBrushRef.current = null;
                }
            }, BRUSH_DEBOUNCE_MS);
        },
    }), []);

    return (
        <div ref={containerRef} className="relative h-full w-full text-foreground bg-card">
            {/* Chart — nodrag/nopan prevent ReactFlow from stealing pointer events */}
            <div className="h-full w-full nodrag nopan">
                <ReactECharts
                    ref={echartRef}
                    notMerge={true}
                    option={option}
                    style={{height: '100%', width: '100%'}}
                    lazyUpdate={true}
                    onEvents={onEvents}
                />
            </div>

            {/* Mode toolbar — overlays the top-right corner of the chart */}
            <div className="absolute top-1.5 right-0">
                <ModeToolbar
                    config={config}
                    queryState={queryState}
                    isCartesian={isCartesian}
                    actions={actions}
                    echartRef={echartRef}
                />
            </div>
        </div>
    );
}


/**
 * Convert ECharts brushSelected event data into ChartQueryState
 * by resolving selected data-point indices back to actual column values.
 */
function extractBrushState(
    brushEvent: any,
    data: RelationData,
    xAxisColumnId: string | undefined,
    yAxisColumnIds: string[] | undefined,
    mode: ChartInteractionMode
): ChartQueryState {
    const batch = brushEvent?.batch ?? [];
    const allIndices = new Set<number>();
    for (const b of batch) {
        for (const sel of (b.selected ?? [])) {
            for (const idx of (sel.dataIndex ?? [])) {
                allIndices.add(idx);
            }
        }
    }

    if (allIndices.size === 0) return {};

    const idToColIndex = new Map<string, number>(data.columns.map((c, i) => [c.id, i]));
    const indices = [...allIndices];

    const newState: ChartQueryState = {};

    if ((mode === 'x-range' || mode === 'box') && xAxisColumnId) {
        const xColIdx = idToColIndex.get(xAxisColumnId);
        if (xColIdx !== undefined) {
            const xVals = indices.map(i => data.rows[i]?.[xColIdx]).filter(v => v !== undefined);
            const xCol = data.columns.find(c => c.id === xAxisColumnId);
            const isNumeric = xCol?.type === 'Integer' || xCol?.type === 'Float' || xCol?.type === 'Timestamp';
            if (isNumeric) {
                const nums = xVals.map(Number).filter(n => !isNaN(n));
                if (nums.length > 0) {
                    newState.xRangeStart = Math.min(...nums);
                    newState.xRangeEnd = Math.max(...nums);
                }
            } else {
                newState.xCategories = [...new Set(xVals)] as (string | number)[];
            }
        }
    }

    if ((mode === 'y-range' || mode === 'box') && yAxisColumnIds?.[0]) {
        const yColIdx = idToColIndex.get(yAxisColumnIds[0]);
        if (yColIdx !== undefined) {
            const yVals = indices.map(i => Number(data.rows[i]?.[yColIdx])).filter(n => !isNaN(n));
            if (yVals.length > 0) {
                newState.yRangeStart = Math.min(...yVals);
                newState.yRangeEnd = Math.max(...yVals);
            }
        }
    }

    return newState;
}
