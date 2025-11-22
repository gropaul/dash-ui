"use client";

import dynamic from "next/dynamic";
import {useEffect, useRef, useState} from "react";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
    ssr: false,
});

interface HistogramChartProps {
    histogramData: { [key: number]: number };
    onRangeChange?: (minValue: number, maxValue: number) => void;
    onRangeChangeEnd?: (minValue: number | null, maxValue: number | null) => void;
    totalCount?: number;
    height?: number;
}

export function HistogramChart({
                                   histogramData,
                                   onRangeChange,
                                   onRangeChangeEnd,
                                   totalCount,
                                   height = 400
                               }: HistogramChartProps) {
    const chartRef = useRef<any>(null);
    const handlersSetupRef = useRef(false);
    const [currentRange, setCurrentRange] = useState<{ min: number; max: number } | null>(null);
    // Calculate approximate selected count from histogram bins
    const calculateSelectedCount = (minValue: number, maxValue: number): number => {
        const bins = Object.keys(histogramData).map(Number).sort((a, b) => a - b);
        const counts = bins.map(bin => {
            const count = histogramData[bin];
            return typeof count === 'bigint' ? Number(count) : count;
        });

        let selectedCount = 0;
        for (let i = 0; i < bins.length; i++) {
            const binValue = bins[i];

            // Determine if this bin is within the selected range
            // For step: 'middle', each bin represents values from midpoint to previous to midpoint to next
            const prevMidpoint = i > 0 ? (bins[i - 1] + binValue) / 2 : binValue - (bins[1] - bins[0]) / 2;
            const nextMidpoint = i < bins.length - 1 ? (binValue + bins[i + 1]) / 2 : binValue + (binValue - bins[i - 1]) / 2;

            // Check if this bin overlaps with the selected range
            if (nextMidpoint > minValue && prevMidpoint < maxValue) {
                // Calculate overlap ratio
                const binStart = Math.max(prevMidpoint, minValue);
                const binEnd = Math.min(nextMidpoint, maxValue);
                const binWidth = nextMidpoint - prevMidpoint;
                const overlapWidth = binEnd - binStart;
                const overlapRatio = overlapWidth / binWidth;

                selectedCount += counts[i] * overlapRatio;
            }
        }

        return Math.round(selectedCount);
    };

    const selectedCount = currentRange
        ? calculateSelectedCount(currentRange.min, currentRange.max)
        : totalCount || 0;

    useEffect(() => {
        if (!chartRef.current) return;

        const instance = chartRef.current.getEchartsInstance();

        // Convert the histogram map to sorted arrays
        const bins = Object.keys(histogramData).map(Number).sort((a, b) => a - b);
        const counts = bins.map(bin => {
            const count = histogramData[bin];
            return typeof count === 'bigint' ? Number(count) : count;
        });

        console.log(bins);
        console.log(counts);

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
                    setCurrentRange({ min: minValue, max: maxValue });
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
                    setCurrentRange({ min: minValue, max: maxValue });
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
                setCurrentRange(null);
                onRangeChangeEnd?.(null, null);
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
            boundaryGap: false,
        },
        yAxis: {
            boundaryGap: false,
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

    // Calculate percentage
    const percentage = totalCount && selectedCount
        ? ((selectedCount / totalCount) * 100).toFixed(1)
        : null;

    return (
        <div style={{ position: 'relative', height, width: '100%' }}>
            <ReactECharts
                ref={chartRef}
                option={option}
                style={{height, width: '100%'}}
            />

            {currentRange && (
                <div
                    style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        pointerEvents: 'none',
                        lineHeight: 1.4,
                    }}
                >
                    <div style={{
                        fontWeight: 600,
                        color: '#000',
                        textShadow: '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 3px #fff'
                    }}>
                        {currentRange.min.toFixed(2)} → {currentRange.max.toFixed(2)}
                    </div>
                    {selectedCount !== undefined && (
                        <div style={{
                            color: '#000',
                            marginTop: 2,
                            textShadow: '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 3px #fff'
                        }}>
                            {selectedCount.toLocaleString()}
                            ~{percentage && ` (${percentage}%)`}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
