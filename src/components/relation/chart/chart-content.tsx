"use client"

import {RelationData} from "@/model/relation";
import {ChartConfig} from "@/model/relation-view-state/chart";

import React from 'react';
import ReactECharts from 'echarts-for-react';
import {EChartsOption} from "echarts-for-react/src/types";
import {toEChartOptions} from "@/components/relation/chart/echart-utils";
import {RelationState} from "@/model/relation-state";
import {RelationViewState} from "@/model/relation-view-state";

export interface MyChartProps {
    embedded?: boolean,
    hideTitleIfEmpty?: boolean,
    relationState: RelationState,
    data: RelationData,


}

export function ChartContent({relationState, data, hideTitleIfEmpty = false, embedded = false}: MyChartProps) {
    const config = relationState.viewState.chartState.chart;
    const option: EChartsOption = toEChartOptions(config, data);

    const heightClass = embedded ? '24rem' : '100%';

    return (
        <div className="h-full w-full flex flex-col items-center relative">
            <ReactECharts notMerge={true} option={option} style={{height: heightClass, width: '100%'}} lazyUpdate={true}/>
        </div>
    )
}
