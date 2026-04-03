"use client"

import {RelationData} from "@/model/relation";

import React, {useEffect, useRef, useState} from 'react';
import ReactECharts from 'echarts-for-react';
import {EChartsOption} from "echarts-for-react/src/types";
import {toEChartOptions} from "@/components/relation/chart/echart-utils";
import {RelationState} from "@/model/relation-state";

export interface MyChartProps {
    embedded?: boolean,
    hideTitleIfEmpty?: boolean,
    relationState: RelationState,
    data: RelationData,


}

export function ChartContent({relationState, data, hideTitleIfEmpty = false, embedded = false}: MyChartProps) {
    const config = relationState.viewState.chartState.chart;
    const containerRef = useRef<HTMLDivElement>(null);
    const [textColor, setTextColor] = useState<string>('#333');

    useEffect(() => {
        if (containerRef.current) {
            const color = getComputedStyle(containerRef.current).getPropertyValue('color').trim();
            if (color) setTextColor(color);
        }
    });

    const option: EChartsOption = toEChartOptions(config, data, textColor);

    const heightClass = embedded ? '24rem' : '100%';

    return (
        <div ref={containerRef} className="h-full w-full flex flex-col items-center relative text-foreground">
            <ReactECharts notMerge={true} option={option} style={{height: heightClass, width: '100%'}} lazyUpdate={true}/>
        </div>
    )
}
