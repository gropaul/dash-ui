"use client";

import dynamic from "next/dynamic";
import {formatNumber} from "@/platform/number-utils";
import {useEffect, useMemo, useRef} from "react";
import {EChartsInstance} from "echarts-for-react";
import {
    GetColors,
    ItemToString,
    PreprocessRawData,
    ToggleSelected
} from "@/components/relation/table/table-head/stats/helper/top-n-helper";

const ReactECharts = dynamic(() => import("echarts-for-react"), {ssr: false});

export type TopNItem = { value: any; count: number }
export type TopNItemTransformed = { valueString: string } & TopNItem;

const barHeight = 20;
const barGap = 2;

export interface TopNChartProps {
    topValues: TopNItem[];
    othersCount?: number;
    nonNullCount: number;
    className?: string;
    selected: any[];
    onSelectedChange: (selected: any[]) => void;
}

export function ColumnStatsViewTopN(props: TopNChartProps) {

    // Keep the chart instance here so React can re-bind handlers correctly
    const chartRef = useRef<EChartsInstance | null>(null);

    // Apply filtering + convert values to strings
    const selectedStrings = props.selected.map(item => ItemToString(item));
    const filtered = useMemo(()=>{
        return PreprocessRawData(props.topValues,  selectedStrings, props.othersCount);
    }, [props.topValues, props.othersCount, props.selected]);


    // Bar sizing
    const chartHeight = filtered.length * (barHeight + barGap) + 8;

    // ECharts option
    const option = useMemo(() => {
        const colors = GetColors(filtered, selectedStrings)
        // extract raw data
        const categories = filtered.map(item => item.valueString);
        const counts = filtered.map(item => item.count);
        const maxCount = counts.length === 0 ? 0 : Math.max(...counts);

        return {
            tooltip: {
                trigger: "axis",
                axisPointer: {type: "shadow"},
                formatter: (params: any) => {
                    const i = params[0].dataIndex;
                    const item = filtered[i];
                    const percentage = ((item.count / props.nonNullCount) * 100).toFixed(1);
                    return `<strong>${item.value}</strong><br/>Count: ${formatNumber(
                        item.count
                    )} (${percentage}%)`;
                },
                appendToBody: true,
                z: 99999
            },
            grid: {
                left: 4,
                right: 4,
                top: 4,
                bottom: 4,
                containLabel: false
            },
            xAxis: {
                type: "value",
                show: false,
                max: maxCount
            },
            yAxis: {
                type: "category",
                show: false,
                data: categories          // ensure correct alignment
            },
            series: [
                // Background clickable band
                {
                    type: "bar",
                    data: counts.map(() => maxCount),
                    barWidth: "100%",
                    barGap: "-100%",
                    itemStyle: {color: "rgba(0,0,0,0)"},
                    silent: false,
                    z: 0
                },
                // Visible bars
                {
                    type: "bar",
                    data: counts,
                    itemStyle: {
                        color: (p: any) => colors[p.dataIndex],
                        borderWidth: 1,
                        borderRadius: [1, 1, 1, 1]
                    },
                    label: {
                        show: true,
                        position: "insideLeft",
                        formatter: (p: any) => categories[p.dataIndex],
                        fontSize: 11
                    },
                    barWidth: barHeight,
                    barCategoryGap: barGap,
                    z: 1
                }
            ]
        };
    }, [filtered, props.nonNullCount]);

    function registerHandler(instance: EChartsInstance) {
        const handler = (params: any) => {
            const index = params.dataIndex;
            if (typeof index !== "number") return;
            const value = filtered[index].value;
            const newSelected = ToggleSelected(props.selected, selectedStrings, value);

            console.log("ENABLE ME AGAIN");
            // todo: current problems:
            // 1. The filteres are added to the view query, not the raw query. The stats
            // are using the raw query, so the filters don't apply to what the stats show.
            // 2. If you define a filter on column A, then change the query to not contain
            // column A, then the query will fail as it will try filter on a non-existing column.
            // props.onSelectedChange(newSelected);
        };

        instance.off("click");
        instance.on("click", handler);

        return handler;
    }

    // Bind click handler reactively
    useEffect(() => {
        const instance = chartRef.current;
        if (!instance) return;
        const handler = registerHandler(instance);


        return () => {
            instance.off("click", handler);
        };
    }, [props.topValues, props.othersCount, props.selected]);

    function onChartReady(instance: EChartsInstance) {
        chartRef.current = instance;
        registerHandler(instance);
    }

    return (
        <div
            className={props.className}
            style={{
                maxHeight: "200px",
                overflowY: "auto",
                scrollbarWidth: "none",
                msOverflowStyle: "none"
            }}
            onWheel={e => e.stopPropagation()}
        >
            <style jsx>{`
                div::-webkit-scrollbar {
                    display: none;
                }
            `}</style>

            <ReactECharts
                option={option}
                style={{height: `${chartHeight}px`, width: "100%"}}
                opts={{renderer: "canvas"}}
                onChartReady={onChartReady}
                lazyUpdate={true}
            />
        </div>
    );
}
