"use client";

import dynamic from "next/dynamic";
import {useEffect, useRef, useState} from "react";
import {formatNumber} from "@/platform/number-utils";

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


export function getCountAtX(
    xs: number[],
    counts: number[],
    x: number,
): number {
    // Find bin index
    let i = 0;
    for (; i < xs.length; i++) {
        if (x <= xs[i]) break;
    }
    if (i >= counts.length) i = counts.length - 1;
    return counts[i];
}


export function getHistogramSubFunction(
    xs: number[],
    counts: number[],
    minRange: number,
    maxRange: number,
): [number, number][] {

    const points: [number, number][] = [];

    // Build the list of x-values
    const xValues: number[] = [minRange];

    // Add all histogram boundaries inside (minRange, maxRange)
    for (const edge of xs) {
        if (edge > minRange && edge < maxRange) {
            xValues.push(edge);
        }
    }

    xValues.push(maxRange);

    // Convert into [x, count]
    for (const x of xValues) {
        points.push([x, getCountAtX(xs, counts, x)]);
    }

    return points;
}


export function getSumOfHistogram(
    histogram: [number, number][],
    binWidth: number,
): number {
    let sum = 0;
    for (let i = 0; i < histogram.length - 1; i++) {
        const [x1, count1] = histogram[i];
        const [x2, count2] = histogram[i + 1];
        const width = x2 - x1;
        const percentage = width / binWidth;
        sum += percentage * count2;
    }
    return sum;
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
    const [selectedCount, setSelectedCount] = useState<number | undefined>(undefined);
    useEffect(() => {
        if (!chartRef.current) return;

        const instance = chartRef.current.getEchartsInstance();

        // Convert the histogram map to sorted arrays
        const bins = Object.keys(histogramData).map(Number).sort((a, b) => a - b);
        const counts = bins.map(bin => {
            const count = histogramData[bin];
            return typeof count === 'bigint' ? Number(count) : count;
        });

        const binWidth = bins.length > 1 ? bins[1] - bins[0] : 1;
        const firstBin = bins[0] - binWidth
        const firstCount = counts[0];
        bins.unshift(firstBin);
        counts.unshift(firstCount);

        // Prepare data for area chart - [x, y] coordinates
        const areaData: [number, number][] = bins.map((bin, idx) => [bin, counts[idx]]);

        // Helper function to update the blue series based on brush range
        const updateBlueSeriesForRange = (minValue: number, maxValue: number) => {
            const subFunction = getHistogramSubFunction(bins, counts, minValue, maxValue);
            const selectedSum = getSumOfHistogram(subFunction, binWidth);
            setSelectedCount(Math.round(selectedSum));
            // Update the blue series to only show selected data
            instance.setOption({
                series: [
                    {},
                    {
                        data: subFunction
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
                step: 'left',
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
                step: 'left',
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
                        {formatNumber(currentRange.min)} → {formatNumber(currentRange.max)}
                    </div>
                    {selectedCount !== undefined && (
                        <div style={{
                            color: '#000',
                            marginTop: 2,
                            textShadow: '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 3px #fff'
                        }}>
                            ~{formatNumber(selectedCount)}
                            {percentage && ` (${percentage}%)`}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
