import React, {useEffect, useRef, useState} from "react";

// import Plot from "react-plotly.js";

interface RelationViewMapProps {
    relationId: string;
    data: any[];
}


export function Map(props: RelationViewMapProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [containerSize, setContainerSize] = useState({width: 0, height: 0});

    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                if (entry.target === containerRef.current) {
                    const {width, height} = entry.contentRect;
                    setContainerSize({width, height});
                }
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, []);

    const layout = {
        autosize: true,
        mapbox: {
            style: "dark",
            center: {lon: 5.3183331489563, lat: 51.700553894043},
            zoom: 12,
        },
        font: {
            family: "Urbanist, sans-serif", // Set font family
            size: 14, // Set font size
            color: "black", // Set font color
        },
        margin: {t: 0, r: 0, b: 0, l: 0},
        width: containerSize.width, // Dynamically set width
        height: containerSize.height, // Dynamically set height
    };

    const config = {
        scrollZoom: true, // Enable mouse wheel zoom
    };

    return (
        <div ref={containerRef} className="w-full h-full overflow-hidden">
            {containerSize.width > 0 && containerSize.height > 0 && (
                /*
                <Plot
                    data={props.data}
                    layout={layout as any}
                    config={config}
                    useResizeHandler={true}
                />
                 */
                <div>Map</div>
            )}
        </div>
    );
}
