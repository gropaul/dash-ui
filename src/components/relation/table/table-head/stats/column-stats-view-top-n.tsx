"use client";

import dynamic from "next/dynamic";
import { formatNumber } from "@/platform/number-utils";
import { LerpColorHex } from "@/platform/colors-utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { EChartsInstance } from "echarts-for-react";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface TopNChartProps {
    topValues: { value: any; count: number }[];
    othersCount?: number;
    nonNullCount: number;
    className?: string;
}

export function ColumnStatsViewTopN({
                                        topValues,
                                        othersCount,
                                        nonNullCount,
                                        className
                                    }: TopNChartProps) {

    // Keep the chart instance here so React can re-bind handlers correctly
    const chartRef = useRef<EChartsInstance | null>(null);

    const [selected, setSelected] = useState<string[]>([]);

    const startColor = "#afc9ff";
    const endColor = "#e6eeff";

    // Build base data
    const rawData = useMemo(() => {
        const data = [...topValues];
        if (othersCount && othersCount > 0) {
            data.push({ value: "Others", count: othersCount });
        }
        return data;
    }, [topValues, othersCount]);

    // Apply filtering + convert values to strings
    const filtered = useMemo(() => {
        return rawData.map(item => {
            const value =
                item.value === null
                    ? "null"
                    : item.value === undefined
                        ? "undefined"
                        : String(item.value);

            let count = item.count;
            if (selected.length > 0 && !selected.includes(value)) {
                count = 0;
            }

            return { value, count };
        });
    }, [rawData, selected]);

    // Sort by count ascending
    filtered.sort((a, b) => a.count - b.count);

    const categories = filtered.map(item => item.value);
    const counts = filtered.map(item => item.count);
    const maxCount = counts.length === 0 ? 0 : Math.max(...counts);

    // Color mapping
    const colors = filtered.map((item, index) => {
        if (selected.includes(item.value)) {
            return "#ff7d7d";
        }

        const t = filtered.length === 1 ? 0 : index / (filtered.length - 1);

        if (item.value === "Others") return "#efefef";
        if (item.value === "null") return "#efefef";
        if (item.value === "undefined") return "#efefef";

        return LerpColorHex(startColor, endColor, 1 - t);
    });

    // Bar sizing
    const barHeight = 20;
    const barGap = 2;
    const chartHeight = filtered.length * (barHeight + barGap) + 8;

    // ECharts option
    const option = useMemo(() => {
        return {
            tooltip: {
                trigger: "axis",
                axisPointer: { type: "shadow" },
                formatter: (params: any) => {
                    const i = params[0].dataIndex;
                    const item = filtered[i];
                    const percentage = ((item.count / nonNullCount) * 100).toFixed(1);
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
                    itemStyle: { color: "rgba(0,0,0,0)" },
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
    }, [filtered, colors, categories, counts, maxCount, nonNullCount]);

    function registerHandler(instance: EChartsInstance) {
        const handler = (params: any) => {
            const index = params.dataIndex;
            if (typeof index !== "number") return;
            const value = categories[index];

            setSelected(prev =>
                prev.includes(value)
                    ? prev.filter(v => v !== value)
                    : [...prev, value]
            );
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
    }, [categories]);

    function onChartReady(instance: EChartsInstance) {
        chartRef.current = instance;
        registerHandler(instance);
    }

    return (
        <div
            className={className}
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
                style={{ height: `${chartHeight}px`, width: "100%" }}
                opts={{ renderer: "canvas" }}
                onChartReady={onChartReady}
            />
        </div>
    );
}
