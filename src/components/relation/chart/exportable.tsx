"use client"

import { saveAs } from 'file-saver';
import { useRef } from "react";
import domtoimage from "dom-to-image";
import {MyChart} from "@/components/relation/chart/my-chart";


export function Exportable() {
    const chartRef = useRef(null);

    const exportChartAsPNG = () => {
        if (!chartRef.current) {
            console.error("No chart ref found");
            return;
        }
        domtoimage.toPng(chartRef.current)
            .then((dataUrl: any) => {
                saveAs(dataUrl, "chart.png");
            })
            .catch((error: any) => {
                console.error("Failed to convert to PNG", error);
            });
    };

    const exportChartAsSVG = () => {
        if (!chartRef.current) {
            console.error("No chart ref found");
            return;
        }
        domtoimage.toSvg(chartRef.current)
            .then((dataUrl: any) => {
                saveAs(dataUrl, "chart.svg");
            })
            .catch((error: any) => {
                console.error("Failed to convert to SVG", error);
            });
    };

    return (
        <div>
            <div ref={chartRef}>
                <MyChart />
            </div>
            <button onClick={exportChartAsPNG}>Export as PNG</button>
            <button onClick={exportChartAsSVG}>Export as SVG</button>
        </div>
    );
}

