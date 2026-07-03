import {ChartConfigProps} from "@/components/relation/chart/chart-config-view";
import {Label} from "@/components/ui/label";
import {Muted} from "@/components/ui/typography";
import {ColumnSelector} from "@/components/relation/chart/chart-config/column-selector";
import {AxisConfig, getInitialAxisDecoration} from "@/model/relation-view-state/chart";
import {Column} from "@/model/data-source-connection";
import {ViewManager} from "@/model/relation-state/relation-view";
import {Separator} from "@/components/ui/separator";
import React from "react";
import {ConfigSection} from "@/components/relation/common/config-section";


export function ConfigViewPie(props: ChartConfigProps) {

    return (
        <>
            <Separator/>
            <ConfigSection title={"Columns to Display"}>
                <ChartColumnSelector {...props} />
            </ConfigSection>
        </>
    )
}

export function ChartColumnSelector(props: ChartConfigProps) {
    const data = props.data
    const columns = data?.columns ?? ([] as Column[]);
    const chart = ViewManager.instance.chart.getQueryParameters(props.relationState);
    const pie = chart.plot.pie;

    function updatePieAxisConfig(axis: Partial<AxisConfig>, key: 'label' | 'radius') {
        if (!axis.decoration) {
            axis.decoration = getInitialAxisDecoration(0);
        }
        props.updateRelationQueryParams({
            chart: {...chart, plot: {...chart.plot, pie: {...chart.plot.pie, axis: {...pie.axis, [key]: axis}}}},
        });
    }

    return (
        <>
            <ColumnSelector
                plotType={chart.plot.type}
                axisType={"pie-label"}
                axis={pie.axis.label}
                columns={columns}
                updateAxis={(update) => updatePieAxisConfig(update, 'label')}
            />
            <ColumnSelector
                plotType={chart.plot.type}
                axisType={"pie-radius"}
                axis={pie.axis.radius}
                columns={columns}
                updateAxis={(update) => updatePieAxisConfig(update, 'radius')}
            />
        </>
    )
}
