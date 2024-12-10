import Plot from "react-plotly.js";


export interface BarChartProps {

}

export function BarChart(props: BarChartProps) {

    const colors = ["5e2bff","36827f","db504a","e3b505","f2d7ee"]

    var data = [
        {
            x: ['Giraffes', 'Orangutans', 'Monkeys'],
            y: [20, 14, 23],
            type: 'bar',
            marker: {
                color: 'E0D6FF',
                line: {
                    color: colors[0],
                    width: 3
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
    };
    return (
        <Plot
            data={data as any}
            layout={layout as any}
        />
    )
}