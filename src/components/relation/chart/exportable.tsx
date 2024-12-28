"use client";

import {saveAs} from 'file-saver';
import {forwardRef, useImperativeHandle, useRef} from "react";
import satori from "satori";
import domtoimage from "dom-to-image";

// Define props and methods interface
export interface ExportableProps {
    children?: React.ReactNode;
    fileName?: string;
}

export interface ExportableRef {
    exportChartAsPNG: () => void;
    exportChartAsSVG: () => void;
}

export const Exportable = forwardRef<ExportableRef, ExportableProps>(
    ({ children, fileName }: ExportableProps, ref) => {
        const chartRef = useRef<HTMLDivElement>(null);

        // Export as PNG
        const exportChartAsPNG = () => {
            if (!chartRef.current) {
                console.error("No chart ref found");
                return;
            }

            const scale = 3; // Scale factor for higher resolution (e.g., 2x, 3x)

            // Get the bounding rectangle dimensions
            const rect = chartRef.current.getBoundingClientRect();

            domtoimage.toPng(chartRef.current, {
                quality: 1.0, // Set quality to 100%
                width: rect.width * scale, // Increase width based on scale
                height: rect.height * scale, // Increase height based on scale
                style: {
                    transform: `scale(${scale})`, // Scale up
                    transformOrigin: "top left", // Maintain alignment
                    width: `${rect.width}px`, // Original width
                    height: `${rect.height}px`, // Original height
                },
            })
                .then((dataUrl: string) => {
                    saveAs(dataUrl, `${fileName ?? "chart"}.png`);
                })
                .catch((error: any) => {
                    console.error("Failed to convert to PNG", error);
                });
        };

        // Export as SVG
        const exportChartAsSVG = async () => {
            if (!chartRef.current) {
                console.error("No chart ref found");
                return;
            }

            try {
                // Measure the size of the DOM element
                const rect = chartRef.current.getBoundingClientRect();
                const width = Math.ceil(rect.width);
                const height = Math.ceil(rect.height);

                // Load the Urbanist font
                const fontData = await fetch("/fonts/Urbanist-VariableFont_wght.ttf")
                    .then((res) => res.arrayBuffer());

                // Generate SVG using Satori
                const svg = await satori(
                    children,
                    {
                        width,
                        height,
                        fonts: [
                        ],
                    }
                );

                const blob = new Blob([svg], { type: 'image/svg+xml' });
                saveAs(blob, `${fileName ?? "chart"}.svg`);
            } catch (error: any) {
                console.error("Failed to convert to SVG with Satori", error);
            }
        };

        // Expose functions to parent
        useImperativeHandle(ref, () => ({
            exportChartAsPNG,
            exportChartAsSVG,
        }));

        return (
            <>
                <div ref={chartRef} className={"w-full h-full"}>
                    {children}
                </div>
            </>
        );
    }
);
