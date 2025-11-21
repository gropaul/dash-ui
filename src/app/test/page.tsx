"use client";

import dynamic from "next/dynamic";
import {useRef, useState} from "react";
import {ConnectionsService} from "@/state/connections/connections-service";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
    ssr: false,
});

// Helper: compute histogram
async function computeHistogram(n_values: number = 1000, binCount: number = 20) {
    const sample_query = `
        CREATE OR REPLACE TEMP TABLE data AS (
            SELECT sqrt(-2 * log(uniform1)) * cos(2 * pi() * uniform2) AS normal_sample
            FROM (
                SELECT random() AS uniform1,
                random() AS uniform2
                FROM range(10000) -- number of samples
            )s
        );`;
    // wait for 3 seconds to simulate async data fetching
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await ConnectionsService.getInstance().executeQuery(sample_query);

    const histogram_query = `
        WITH bounds AS (
            SELECT
                min(normal_sample) AS min_val,
                max(normal_sample) AS max_val,
                equi_width_bins(min_val, max_val, 21, true) as bins
            FROM data
        )
        SELECT histogram(normal_sample, (SELECT bins FROM bounds)) AS histogram
        FROM data;
    `;

    const result = await ConnectionsService.getInstance().executeQuery(histogram_query);
    return result.rows[0][0] as any;
}

// Helper: load data from the data table based on exact value range
async function loadDataInRange(minValue: number, maxValue: number): Promise<number[]> {
    const query = `
        SELECT normal_sample
        FROM data
        WHERE normal_sample >= ${minValue} AND normal_sample <= ${maxValue}
        ORDER BY normal_sample 
        LIMIT 100;
    `;

    const result = await ConnectionsService.getInstance().executeQuery(query);
    return result.rows.map(row => row[0] as number);
}

// Helper: load all data from the data table
async function loadAllData(): Promise<number[]> {
    const query = `SELECT normal_sample FROM data ORDER BY normal_sample LIMIT 100;`;
    const result = await ConnectionsService.getInstance().executeQuery(query);
    return result.rows.map(row => row[0] as number);
}

export default function HistogramDemo() {
    const [selectedValues, setSelectedValues] = useState<number[]>([]);
    const [chartInstance, setChartInstance] = useState<any>(null);
    const [brushActive, setBrushActive] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Debounce timer for data loading
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Debounced function to load data from DuckDB based on exact brush range
    const loadDataDebounced = (brushRange: [number, number] | null) => {
        // Clear any existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Set a new timer to load data after 500ms of inactivity
        debounceTimerRef.current = setTimeout(async () => {
            setIsLoadingData(true);
            try {
                if (!brushRange) {
                    // Load all data
                    const allData = await loadAllData();
                    setSelectedValues(allData);
                } else {
                    const [minValue, maxValue] = brushRange;
                    console.log(`Loading data in exact range: ${minValue} to ${maxValue}`);
                    const rangeData = await loadDataInRange(minValue, maxValue);
                    setSelectedValues(rangeData);
                }
            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                setIsLoadingData(false);
            }
        }, 500); // 500ms debounce delay
    };

    const handleChartReady = async (instance: any) => {
        setChartInstance(instance);
        // With the improved convertArrowValue, data is now a properly converted JavaScript object
        // Format: {bin_value: count, bin_value: count, ...} e.g. {-2.5: 10, -1.5: 25, -0.5: 50, ...}
        const histogramData = await computeHistogram(1000, 20);

        // Convert the histogram map to sorted arrays
        const bins = Object.keys(histogramData).map(Number).sort((a, b) => a - b);
        const counts = bins.map(bin => {
            const count = histogramData[bin];
            // Convert BigInt to Number if necessary
            return typeof count === 'bigint' ? Number(count) : count;
        });

        // Prepare data for area chart - [x, y] coordinates
        const areaData = bins.map((bin, idx) => [bin, counts[idx]]);

        // Create two series: one gray (background) and one blue (selected area)
        instance.setOption({
            xAxis: {
                type: 'value',
                name: "Value Range"
            },
            yAxis: {
                type: 'value',
                name: 'Count'
            },
            series: [
                // Gray background series (always visible)
                {
                    type: 'line',
                    step: 'middle',
                    data: areaData,
                    smooth: false,
                    symbol: 'none',
                    lineStyle: {
                        color: '#9ca3af',
                        width: 1
                    },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                                {
                                    offset: 0,
                                    color: 'rgba(156, 163, 175, 0.4)'
                                },
                                {
                                    offset: 1,
                                    color: 'rgba(156, 163, 175, 0.05)'
                                }
                            ]
                        }
                    },
                    z: 1
                },
                // Blue selected area series (initially shows all data)
                {
                    type: 'line',
                    step: 'middle',
                    data: areaData,
                    smooth: false,
                    symbol: 'none',
                    animation: false,
                    lineStyle: {
                        color: '#3b82f6',
                        width: 1
                    },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                                {
                                    offset: 0,
                                    color: 'rgba(59, 130, 246, 0.8)'
                                },
                                {
                                    offset: 1,
                                    color: 'rgba(59, 130, 246, 0.1)'
                                }
                            ]
                        }
                    },
                    z: 2
                }
            ]
        });

        // Load all data initially
        setIsLoadingData(true);
        const allData = await loadAllData();
        setSelectedValues(allData);
        setIsLoadingData(false);

        // 1) Activate brush mode by default
        instance.dispatchAction({
            type: "takeGlobalCursor",
            key: "brush",
            brushOption: {brushType: "lineX"}
        });

        // 2) Attach listener for brush selection using brushEnd which gives us coordinate ranges
        const handleBrushEnd = (params: any) => {
            if (params.areas && params.areas.length > 0) {
                // Get the brush area - for lineX brush, we care about the x-axis range
                const area = params.areas[0];
                const coordRange = area.coordRange; // With value-type axis, this gives actual x values

                if (coordRange && coordRange.length === 2) {
                    const [minValue, maxValue] = coordRange;

                    console.log('========================================');
                    console.log('Brush Selection X-Axis Values:');
                    console.log(`  Start X: ${minValue}`);
                    console.log(`  End X:   ${maxValue}`);
                    console.log(`  Range:   ${(maxValue - minValue).toFixed(4)}`);
                    console.log('========================================');

                    // Filter data to show the selected range in blue, with edge points for complete fill
                    const filteredData: [number, number][] = [];

                    // For step: 'middle', we need to determine which bin's y-value applies at each boundary

                    // Find which bins the boundaries fall into
                    let leftBinIndex = -1;
                    let rightBinIndex = -1;

                    for (let i = 0; i < areaData.length - 1; i++) {
                        const x = areaData[i][0];
                        const nextX = areaData[i + 1][0];
                        const midpoint = (x + nextX) / 2;

                        // For step: 'middle', the y-value of bin i applies from midpoint[i-1,i] to midpoint[i,i+1]
                        if (leftBinIndex === -1) {
                            if (i === 0 && minValue <= midpoint) {
                                leftBinIndex = i;
                            } else if (i > 0) {
                                const prevX = areaData[i - 1][0];
                                const prevMidpoint = (prevX + x) / 2;
                                if (minValue >= prevMidpoint && minValue <= midpoint) {
                                    leftBinIndex = i;
                                }
                            }
                        }

                        if (i === 0 && maxValue <= midpoint) {
                            rightBinIndex = i;
                            break;
                        } else if (i > 0) {
                            const prevX = areaData[i - 1][0];
                            const prevMidpoint = (prevX + x) / 2;
                            if (maxValue >= prevMidpoint && maxValue <= midpoint) {
                                rightBinIndex = i;
                                break;
                            }
                        }
                    }

                    // Handle edge cases
                    if (leftBinIndex === -1) leftBinIndex = 0;
                    if (rightBinIndex === -1) rightBinIndex = areaData.length - 1;

                    // Add left boundary point
                    filteredData.push([minValue, areaData[leftBinIndex][1]]);

                    // Add all bins from leftBinIndex to rightBinIndex
                    for (let i = leftBinIndex; i <= rightBinIndex; i++) {
                        filteredData.push(areaData[i]);
                    }

                    // Add right boundary point
                    filteredData.push([maxValue, areaData[rightBinIndex][1]]);

                    // Update the blue series to only show selected data
                    instance.setOption({
                        series: [
                            {}, // Keep gray series unchanged
                            {
                                data: filteredData
                            }
                        ]
                    });

                    loadDataDebounced([minValue, maxValue]);
                }
            } else {
                // Brush was cleared - show all data in blue
                instance.setOption({
                    series: [
                        {}, // Keep gray series unchanged
                        {
                            data: areaData
                        }
                    ]
                });
                loadDataDebounced(null);
            }
        };

        instance.on("brushEnd", handleBrushEnd);
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
            show: true, // Disable tooltip
        },
        grid: {
            left: "3%",
            right: "4%",
            bottom: "3%",
            containLabel: true,
        },
        xAxis: {
            type: "value",
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
                color: "rgba(59, 130, 246, 0.1)",
            },
            seriesIndex: [] // Don't apply brush dimming to any series
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
                        onClick={() => {
                            if (chartInstance) {
                                chartInstance.dispatchAction({
                                    type: 'brush',
                                    command: 'clear',
                                    areas: []
                                });
                            }
                        }}
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
                    <h2 className="text-lg font-semibold mb-2">
                        Selected Values ({selectedValues.length})
                        {isLoadingData && (
                            <span className="ml-2 text-sm text-gray-500 font-normal">
                                Loading...
                            </span>
                        )}
                    </h2>
                    <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                        <table className="w-full">
                            <thead className="bg-gray-100 border-b sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left">Index</th>
                                <th className="px-4 py-2 text-left">Value</th>
                            </tr>
                            </thead>
                            <tbody>
                            {selectedValues.length > 0 ? (
                                selectedValues.map((value, idx) => (
                                    <tr key={idx} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-2">{idx + 1}</td>
                                        <td className="px-4 py-2">{value.toFixed(4)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                                        {isLoadingData ? "Loading data..." : "No data selected"}
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </>

        </div>
    );
}
