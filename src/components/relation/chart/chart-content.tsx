"use client"

import {RelationData} from "@/model/relation";
import {ChartConfig} from "@/model/relation-view-state/chart";

import React from 'react';
import ReactECharts from 'echarts-for-react';
import {EChartsOption} from "echarts-for-react/src/types";
import {toEChartOptions} from "@/components/relation/chart/echart-utils";

export interface MyChartProps {
    embedded?: boolean,
    data: RelationData,
    hideTitleIfEmpty?: boolean,
    config: ChartConfig
}

export function ChartContent({data, config, hideTitleIfEmpty = false, embedded = false}: MyChartProps) {
    const option: EChartsOption = toEChartOptions(config, data);

    const heightClass = embedded ? '24rem' : '100%';

    console.log('EChartsOption', option);
    return (
        <div className="h-full w-full flex flex-col items-center relative">
            <ReactECharts notMerge={true} option={option} style={{height: heightClass, width: '100%'}} lazyUpdate={true}/>
        </div>
    )
}
