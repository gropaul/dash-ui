"use client";

import dynamic from "next/dynamic";
import {formatNumber} from "@/platform/number-utils";
import {LerpColorHex} from "@/platform/colors-utils";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
    ssr: false,
});

interface TopNChartProps {
    topValues: { value: any; count: number }[];
    othersCount?: number;
    nonNullCount: number;
    className?: string;
}

export function ColumnStatsViewTopN({ topValues, othersCount, nonNullCount, className }: TopNChartProps) {
    // Prepare data for horizontal bar chart - reversed to show max to min
    const data = [...topValues];
    if (othersCount && othersCount > 0) {
        data.push({ value: 'Others', count: othersCount });
    }

    // order the data by count ascending
    data.sort((a, b) => a.count - b.count);

    const startColor = '#afc9ff';
    const endColor = '#e6eeff';

    const colors = data.map((item, index) => {
        if (data.length === 1) {
            return LerpColorHex(startColor, endColor, 0);
        }
        const t = index / (data.length - 1);


        // if name = 'Others' and count is the correct othersCount, use a fixed color
        if (item.value === 'Others' && item.count === othersCount) {
            return '#efefef';
        }

        // do the same with null
        if (item.value === null || item.value === 'null' || item.value === undefined || item.value === 'undefined') {
            return '#efefef';
        }
        return LerpColorHex(startColor, endColor,  1 - t);
    });

    const categories = data.map(item => {
        return item.value === null ? 'null' :
            item.value === undefined ? 'undefined' :
                String(item.value);
    });
    const counts = data.map(item => item.count);
    const maxCount = Math.max(...counts);

    // Fixed bar height for all bars
    const barHeight = 20;
    const barGap = 2;
    const chartHeight = data.length * (barHeight + barGap) + 8; // 8px for top/bottom padding

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: (params: any) => {
                const dataIndex = params[0].dataIndex;
                const item = data[dataIndex];
                const valueStr = item.value === null ? 'null' :
                               item.value === undefined ? 'undefined' :
                               String(item.value);
                const percentage = ((item.count / nonNullCount) * 100).toFixed(1);
                return `<strong>${valueStr}</strong><br/>Count: ${formatNumber(item.count)} (${percentage}%)`;
            },
            appendToBody: true,
            z: 99999,
        },
        grid: {
            left: 4,
            right: 4,
            top: 4,
            bottom: 4,
            containLabel: false,
        },
        xAxis: {
            type: 'value',
            show: false,
            max: maxCount,
        },
        yAxis: {
            show: false,
            type: 'category',
        },
        series: [
            {
                type: 'bar',
                data: counts,
                itemStyle: {
                    color: (params: any) => colors[params.dataIndex],
                    borderWidth: 1,
                    borderRadius: [1,1, 1, 1],
                },
                label: {
                    show: true,
                    position: 'insideLeft',
                    formatter: (params: any) => {
                        const name = categories[params.dataIndex];
                        const percentage = ((params.value / nonNullCount) * 100).toFixed(1);
                        return `${name}`;
                    },
                    fontSize: 11,
                },
                barWidth: barHeight,
                barCategoryGap: barGap,
            }
        ],
    };

    return (
        <div
            className={className}
            style={{
                maxHeight: '200px',
                overflowY: 'auto',
                scrollbarWidth: 'none', // Firefox
                msOverflowStyle: 'none', // IE/Edge
            }}
            onWheel={(e) => {
                // Prevent scroll propagation to parent table
                e.stopPropagation();
            }}
        >
            <style jsx>{`
                div::-webkit-scrollbar {
                    display: none; /* Chrome, Safari, Opera */
                }
            `}</style>
            <ReactECharts
                option={option}
                style={{ height: `${chartHeight}px`, width: '100%' }}
                opts={{ renderer: 'svg' }}
            />
        </div>
    );
}
