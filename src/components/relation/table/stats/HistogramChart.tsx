"use client";

import dynamic from "next/dynamic";
import {useEffect, useRef} from "react";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
    ssr: false,
});

interface HistogramChartProps {
    histogramData: { [key: number]: number };
    onRangeChange?: (minValue: number, maxValue: number) => void;
    onRangeChangeEnd?: (minValue: number, maxValue: number) => void;
    height?: number;
}

export function HistogramChart({
                                   histogramData,
                                   onRangeChange,
                                   onRangeChangeEnd,
                                   height = 400
                               }: HistogramChartProps) {
    const chartRef = useRef<any>(null);
    const handlersSetupRef = useRef(false);

    useEffect(() => {
        if (!chartRef.current) return;

        const instance = chartRef.current.getEchartsInstance();

        // Convert the histogram map to sorted arrays
        const bins = Object.keys(histogramData).map(Number).sort((a, b) => a - b);
        const counts = bins.map(bin => {
            const count = histogramData[bin];
            return typeof count === 'bigint' ? Number(count) : count;
        });

        // Prepare data for area chart - [x, y] coordinates
        const areaData: [number, number][] = bins.map((bin, idx) => [bin, counts[idx]]);

        // Helper function to update the blue series based on brush range
        const updateBlueSeriesForRange = (minValue: number, maxValue: number) => {
            const filteredData: [number, number][] = [];

            // Find which bins the boundaries fall into
            let leftBinIndex = -1;
            let rightBinIndex = -1;

            for (let i = 0; i < areaData.length - 1; i++) {
                const x = areaData[i][0];
                const nextX = areaData[i + 1][0];
                const midpoint = (x + nextX) / 2;

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
                filteredData.push([areaData[i][0], areaData[i][1]] as [number, number]);
            }

            // Add right boundary point
            filteredData.push([maxValue, areaData[rightBinIndex][1]]);

            // Update the blue series to only show selected data
            instance.setOption({
                series: [
                    {},
                    {
                        data: filteredData
                    }
                ]
            });
        };

        // Handle brush during dragging (real-time updates)
        const handleBrushing = (params: any) => {
            if (params.areas && params.areas.length > 0) {
                const area = params.areas[0];
                const coordRange = area.coordRange;

                if (coordRange && coordRange.length === 2) {
                    const [minValue, maxValue] = coordRange;
                    updateBlueSeriesForRange(minValue, maxValue);
                    onRangeChange?.(minValue, maxValue);
                }
            }
        };

        // Handle brush end (final selection)
        const handleBrushEnd = (params: any) => {
            if (params.areas && params.areas.length > 0) {
                const area = params.areas[0];
                const coordRange = area.coordRange;

                if (coordRange && coordRange.length === 2) {
                    const [minValue, maxValue] = coordRange;
                    onRangeChangeEnd?.(minValue, maxValue);
                }
            } else {
                // Brush was cleared - show all data in blue
                instance.setOption({
                    series: [
                        {},
                        {
                            data: areaData
                        }
                    ]
                });
                const minValue = bins[0];
                const maxValue = bins[bins.length - 1];
                onRangeChangeEnd?.(minValue, maxValue);
            }
        };

        // Only set up handlers once
        if (!handlersSetupRef.current) {
            instance.on("brush", handleBrushing);
            instance.on("brushEnd", handleBrushEnd);

            // Activate brush mode
            instance.dispatchAction({
                type: "takeGlobalCursor",
                key: "brush",
                brushOption: {brushType: "lineX"}
            });

            handlersSetupRef.current = true;
        }

        // Update chart data when histogram changes
        instance.setOption({
            series: [
                {
                    data: areaData
                },
                {
                    data: areaData
                }
            ]
        });
    }, [histogramData]);

    const option = {
        tooltip: {
            show: true,
        },
        grid: {
            left: 0,
            right: 0,
            top: 0,
            bottom: 32,
            containLabel: false,
        },
        xAxis: {
            type: "value",
        },
        yAxis: {
            show: false,
            type: "value",
            axisLine: {
                show: false,
            },
            axisTick: {
                show: false,
            },
            splitLine: {
                show: false,
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
            seriesIndex: []
        },
        toolbox: {
            show: false,
        },
        series: [
            // Gray background series
            {
                type: 'line',
                step: 'middle',
                data: [],
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
            // Blue selected area series
            {
                type: 'line',
                step: 'middle',
                data: [],
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
        ],
    };

    return (
        <ReactECharts
            ref={chartRef}
            option={option}
            style={{height, width: '100%'}}
        />
    );
}
