import * as echarts from 'echarts/core';
import {BarChart, LineChart, PieChart, RadarChart, ScatterChart} from 'echarts/charts';
import {
    BrushComponent,
    GraphicComponent,
    GridComponent,
    LegendComponent,
    RadarComponent,
    TitleComponent,
    ToolboxComponent,
    TooltipComponent,
} from 'echarts/components';
import {CanvasRenderer} from 'echarts/renderers';
import EChartsReactCore from 'echarts-for-react/lib/core';
import type {EChartsReactProps} from 'echarts-for-react/lib/types';

// Only what the charts and the column stats use, in place of all of ECharts (about 1 MB).
echarts.use([
    BarChart, LineChart, PieChart, RadarChart, ScatterChart,
    BrushComponent, GraphicComponent, GridComponent, LegendComponent, RadarComponent, TitleComponent,
    ToolboxComponent, TooltipComponent,
    CanvasRenderer,
]);

/** echarts-for-react's component on the ECharts above; it does the same with the whole package. */
export default class ReactECharts extends EChartsReactCore {
    constructor(props: EChartsReactProps) {
        super(props);
        this.echarts = echarts;
    }
}
