"use client";

import dynamic from "next/dynamic";
import { formatNumber } from "@/platform/number-utils";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
    ssr: false,
});

interface TopNChartProps {
    topValues: { value: any; count: number }[];
    othersCount?: number;
    nonNullCount: number;
    className?: string;
}

export function TopNChart({ topValues, othersCount, nonNullCount, className }: TopNChartProps) {
    // Prepare data for horizontal bar chart - reversed to show max to min
    const data = [...topValues].reverse();
    if (othersCount && othersCount > 0) {
        data.push({ value: 'Others', count: othersCount });
    }

    const categories = data.map(item => {
        const valueStr = item.value === null ? 'null' :
                        item.value === undefined ? 'undefined' :
                        String(item.value);
        return valueStr;
    });
    const counts = data.map(item => item.count);
    const maxCount = Math.max(...counts);

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
            }
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
                    color: '#e6eeff',
                    borderWidth: 1,
                    borderRadius: [0, 0, 0, 0],
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
                barMaxWidth: 20,
            }
        ],
    };

    return (
        <div className={className}>
            <ReactECharts
                option={option}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'svg' }}
            />
        </div>
    );
}
