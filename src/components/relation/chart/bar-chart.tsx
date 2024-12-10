import Plot from "react-plotly.js";
import {lightenColor} from "@/platform/colors-utils";


export interface BarChartProps {

}

export function BarChart(props: BarChartProps) {

    const colors = ["5e2bff","3C908D","db504a","e3b505","f2d7ee"]
    const lightColors = colors.map(color => lightenColor(color, 0.35))

    var data = [
        {
            x: ['Giraffes', 'Orangutans', 'Monkeys'],
            y: [20, 14, 23],
            type: 'bar',
            marker: {
                color: lightColors[0],
                line: {
                    color: colors[0],
                    width: 1
                }
            }
        },
        {
            x: ['Giraffes', 'Orangutans', 'Monkeys', 'dwad'],
            y: [12, 18, 29,12],
            type: 'bar',
            marker: {
                color: lightColors[1],
                line: {
                    color: colors[1],
                    width: 1
                }
            }
        }
    ];

    const layout = {
        font: {
            family: 'Urbanist, sans-serif',
            size: 12,
            color: '#444'
        },
        title: 'A Fancy Bar Chart',
        barcornerradius: 2,
        margin: {t: 0, r: 0, b: 0, l: 0},
    };
    return (
        <div className="w-full h-full">
            <Plot
                data={data as any}
                layout={layout as any}
                useResizeHandler={true}
            />
        </div>
    )
}