import {BarChart} from "@/components/relation/chart/bar-chart";


export interface ChartProps {
    relationId: string;
}

export function Chart(props: ChartProps) {
    return (
        <BarChart />
    )
}