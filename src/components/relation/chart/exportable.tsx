"use client"

import { saveAs } from 'file-saver';
import { useRef } from "react";
import domtoimage from "dom-to-image";
import {Button} from "@/components/ui/button";

export interface ExportableProps {
    children?: React.ReactNode;
    fileName?: string;
}

export function Exportable({children, fileName}: ExportableProps) {
    const chartRef = useRef(null);

    const exportChartAsPNG = () => {
        if (!chartRef.current) {
            console.error("No chart ref found");
            return;
        }
        domtoimage.toPng(chartRef.current, { quality: 10.0 })
            .then((dataUrl: any) => {
                saveAs(dataUrl, `${fileName ?? "chart"}.png`);
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
                saveAs(dataUrl, `${fileName ?? "chart"}.svg`);
            })
            .catch((error: any) => {
                console.error("Failed to convert to SVG", error);
            });
    };

    return (
        <>
            <div ref={chartRef}>
                {children}
            </div>
            <div className={'flex gap-2'}>
                <Button onClick={exportChartAsPNG} variant={'outline'}>Export as PNG</Button>
                <Button onClick={exportChartAsSVG} variant={'outline'}>Export as SVG</Button>
            </div>
        </>
    );
}

