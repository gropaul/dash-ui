"use client";

import dynamic from "next/dynamic";
import {useMemo, useState} from "react";
import * as echarts from "echarts";
import {ConnectionsService} from "@/state/connections/connections-service";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
    ssr: false,
});

// Helper: compute histogram
async function computeHistogram(n_values: number = 1000, binCount: number = 20) {
    const sample_query = `
        CREATE TEMP TABLE data AS (
            SELECT sqrt(-2 * log(uniform1)) * cos(2 * pi() * uniform2) AS normal_sample
            FROM (
                SELECT random() AS uniform1,
                random() AS uniform2
                FROM range(1000) -- number of samples
            )
        );`;
    // wait for 3 seconds to simulate async data fetching
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await ConnectionsService.getInstance().executeQuery(sample_query);

    const histogram_query = `
        WITH bounds AS (
            SELECT 
                min(normal_sample) AS min_val,
                max(normal_sample) AS max_val,
                equi_width_bins(min_val, max_val, 10, true) as bins
            FROM data
        )
        SELECT histogram(normal_sample, (SELECT bins FROM bounds)) AS histogram
        FROM data;
    `;

    const result = await ConnectionsService.getInstance().executeQuery(histogram_query);
    const value = result.rows[0][0] as any;
    console.log(result)
    console.log(value);
}

export default function HistogramDemo() {
    // Generate normal distribution data (mean=10, std dev=2, 100 samples)


    const [selectedValues, setSelectedValues] = useState<number[]>([]);
    const [chartInstance, setChartInstance] = useState<any>(null);
    const [brushActive, setBrushActive] = useState(true);

    const handleChartReady = async (instance: any) => {
        setChartInstance(instance);

        const data = await computeHistogram(1000, 20);

        // 1) Activate brush mode by default
        instance.dispatchAction({
            type: "takeGlobalCursor",
            key: "brush",
            brushOption: {brushType: "lineX"}
        });

        return;

        // 2) Attach the listener
        const handleBrushSelected = (params: any) => {
            console.log(params);
            const selected = params.batch[0].selected[0]?.dataIndex ?? [];
            const selectedLabels = selected.map((i: number) =>
                bins[i].toFixed(2)
            );
            console.log("Selected bins:", selected);
            console.log("Selected labels:", selectedLabels);

            // Filter values that fall within selected bins
            if (selected.length > 0) {
                const min = Math.min(...demoData);
                const max = Math.max(...demoData);
                const step = (max - min) / binCount;

                const valuesInRange = demoData.filter((v) => {
                    const idx = Math.floor((v - min) / step);
                    const clampedIdx = Math.max(0, Math.min(idx, binCount - 1));
                    return selected.includes(clampedIdx);
                });

                setSelectedValues(valuesInRange);
            } else {
                setSelectedValues(demoData); // Show all when no selection
            }
        };

        instance.on("brushSelected", handleBrushSelected);
    };

    const toggleBrush = () => {
        if (!chartInstance) return;

        if (brushActive) {
            // Deactivate brush
            chartInstance.dispatchAction({
                type: "takeGlobalCursor",
            });
            setBrushActive(false);
        } else {
            // Activate brush
            chartInstance.dispatchAction({
                type: "takeGlobalCursor",
                key: "brush",
                brushOption: {brushType: "lineX"}
            });
            setBrushActive(true);
        }
    };

    const option = {
        tooltip: {
            show: false, // Disable tooltip
        },
        grid: {
            left: "3%",
            right: "4%",
            bottom: "3%",
            containLabel: true,
        },
        xAxis: {
            type: "category",
            data: [],
            name: "Value",
            axisLine: {
                lineStyle: {
                    color: "#666",
                },
            },
        },
        yAxis: {
            type: "value",
            name: "Count",
            axisLine: {
                lineStyle: {
                    color: "#666",
                },
            },
            splitLine: {
                lineStyle: {
                    color: "#e5e7eb",
                },
            },
        },

        brush: {
            toolbox: ["lineX", "clear"],
            xAxisIndex: 0,
            brushMode: "single",
            brushStyle: {
                borderWidth: 1,
                borderColor: "rgba(107, 114, 128, 0.2)", // Gray border
                color: "rgba(107, 114, 128, 0.2)", // Light gray fill
            },
            outOfBrush: {
                colorAlpha: 0.3, // Dim unselected bars
            },
        },
        toolbox: {
            show: false, // Hide default toolbox
        },

        series: [
            {
                type: "bar",
                data: [],
                itemStyle: {
                    color: "#3b82f6", // Bar color (blue)
                    borderRadius: [4, 4, 0, 0], // Rounded top corners
                },
                emphasis: {
                    disabled: true, // Disable hover highlight
                },
            },
        ],
    };

    return (
        <div className="p-6">
            <h1 className="text-xl font-bold mb-4">Histogram Range Selector</h1>


            <>
                {/* Custom Toolbox */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={toggleBrush}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            brushActive
                                ? "bg-gray-700 text-white shadow-md"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                    >
                        {brushActive ? (
                            <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/>
                                    </svg>
                                    Selection Active
                                </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/>
                                    </svg>
                                    Enable Selection
                                </span>
                        )}
                    </button>
                    <button
                        className="px-4 py-2 rounded-lg font-medium bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
                    >
                            <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                                Clear Selection
                            </span>
                    </button>
                </div>

                <ReactECharts
                    option={option}
                    style={{height: 400}}
                    onChartReady={handleChartReady}
                />

                <div className="mt-6">
                    <h2 className="text-lg font-semibold mb-2">Selected Values ({selectedValues.length})
                    </h2>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-100 border-b">
                            <tr>
                                <th className="px-4 py-2 text-left">Index</th>
                                <th className="px-4 py-2 text-left">Value</th>
                            </tr>
                            </thead>
                            <tbody>
                            {selectedValues.map((value, idx) => (
                                <tr key={idx} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-2">{idx + 1}</td>
                                    <td className="px-4 py-2">{value.toFixed(4)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </>

        </div>
    );
}
