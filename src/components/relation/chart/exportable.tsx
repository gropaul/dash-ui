"use client"

import { saveAs } from 'file-saver';
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import satori from "satori"; // Import Satori
import domtoimage from "dom-to-image";


export interface ExportableProps {
    children?: React.ReactNode;
    fileName?: string;
}

export function Exportable({ children, fileName }: ExportableProps) {
    const chartRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(false);

    const exportChartAsPNG = () => {
        // If you still want PNG export, you can keep your dom-to-image code here.
        // This is unchanged from your original snippet:
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

    const exportChartAsSVG = async () => {
        if (!chartRef.current) {
            console.error("No chart ref found");
            return;
        }

        setIsLoading(true);

        try {
            // Measure the DOM element to get width and height
            const rect = chartRef.current.getBoundingClientRect();
            const width = Math.ceil(rect.width);
            const height = Math.ceil(rect.height);

            // Render children using Satori
            // Note: Satori expects a subset of CSS and may require font data.
            // Below is a minimal example. You may need to provide fonts if text doesn't render properly.
            const svg = await satori(
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width,
                        height,
                        // Include any inline styles needed, but remember Satori doesn't support all CSS features.
                    }}
                >
                    {children}
                </div>,
                {
                    width,
                    height,
                    fonts: [
                        // You may need to provide font data here if text doesn't render properly.
                        // For example, you can use Google Fonts API to fetch font data.
                    ],
                }
            );

            // svg is a string containing the SVG markup.
            // Convert it to a Blob to use with file-saver
            const blob = new Blob([svg], { type: 'image/svg+xml' });
            saveAs(blob, `${fileName ?? "chart"}.svg`);
        } catch (error: any) {
            console.error("Failed to convert to SVG with Satori", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {children}
            <div className={'flex gap-2'}>
                <Button onClick={exportChartAsPNG} variant={'outline'}>Export as PNG</Button>
                <Button onClick={exportChartAsSVG} variant={'outline'} disabled={isLoading}>
                    {isLoading ? "Exporting..." : "Export as SVG"}
                </Button>
            </div>
        </>
    );
}
