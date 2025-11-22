"use client";

import {useRef, useState} from "react";
import {ConnectionsService} from "@/state/connections/connections-service";
import {HistogramChart} from "@/components/relation/table/stats/HistogramChart";

// Helper: compute histogram
async function computeHistogram() {
    let sample_query = `
        CREATE OR REPLACE TEMP TABLE data AS (
            SELECT
            epoch(ArrivalTime) AS normal_sample
            FROM 'https://raw.githubusercontent.com/gropaul/dash-ui/main/test/data/services-2025-38.parquet'            LIMIT 10000
        );`;
    // sample_query = `
    //     CREATE OR REPLACE TEMP TABLE data AS (
    //         SELECT (random() - 0.5) * range * range as normal_sample FROM range(1000000)
    //     );`;
    // wait for 3 seconds to simulate async data fetching
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await ConnectionsService.getInstance().executeQuery(sample_query);

    const histogram_query = `
        WITH bounds AS (
            SELECT
                min(normal_sample) AS min_val,
                max(normal_sample) AS max_val,
                equi_width_bins(min_val, max_val, 21, false) as bins
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
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [histogramData, setHistogramData] = useState<{ [key: number]: number }>({});
    const [totalCount, setTotalCount] = useState<number>(0);

    // Debounce timer for data loading
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Debounced function to load data from DuckDB based on exact brush range
    const loadDataDebounced = (minValue: number | null, maxValue: number | null) => {
        // Clear any existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Set a new timer to load data after 500ms of inactivity
        debounceTimerRef.current = setTimeout(async () => {
            setIsLoadingData(true);
            try {
                if (minValue === null || maxValue === null) {
                    // No range selected - load all data without WHERE clause
                    const allData = await loadAllData();
                    setSelectedValues(allData);
                } else {
                    // Range selected - load data with WHERE clause
                    const rangeData = await loadDataInRange(minValue, maxValue);
                    setSelectedValues(rangeData);
                }
            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                setIsLoadingData(false);
            }
        }, 500);
    };

    // Initialize histogram data
    const initializeData = async () => {
        setIsLoadingData(true);
        const data = await computeHistogram();
        setHistogramData(data);

        // Get total count from database
        const countQuery = 'SELECT COUNT(*) as count FROM data';
        const countResult = await ConnectionsService.getInstance().executeQuery(countQuery);
        const total = countResult.rows[0][0];
        setTotalCount(typeof total === 'bigint' ? Number(total) : total);

        const allData = await loadAllData();
        setSelectedValues(allData);
        setIsLoadingData(false);
    };


    return (
        <div className="p-6">
            <h1 className="text-xl font-bold mb-4">Histogram Range Selector</h1>

            <div className="flex gap-2 mb-4">
                <button
                    onClick={initializeData}
                    className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all"
                >
                    Load Data
                </button>
            </div>

            {Object.keys(histogramData).length > 0 && (
                <>
                    <div>
                        <HistogramChart
                            histogramData={histogramData}
                            onRangeChangeEnd={loadDataDebounced}
                            totalCount={totalCount}
                            height={128 + 64}
                            dataType={'timestamp'}
                        />
                    </div>

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
            )}
        </div>
    );
}
