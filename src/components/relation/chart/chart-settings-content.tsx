import React, {useState} from "react";
import {
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger
} from "@/components/ui/dropdown-menu";
import {Download, LayoutDashboard, Settings, X} from "lucide-react";

import {RelationSettingsProps} from "@/components/relation/relation-settings";
import {DashboardCommand} from "@/components/workbench/dashboard-command";
import {useRelationsState} from "@/state/relations.state";
import {DashboardCommandState, onAddToDashboardSelected} from "@/components/workbench/editor-overview-tab";
import {useRelationContext} from "@/components/relation/chart/chart-export-context";

export function ChartSettingsContent(props: RelationSettingsProps) {

    const chartExport = useRelationContext();

    const showChartSettings = props.relationState.viewState.chartState.view.showConfig;

    function updateShowConfig() {
        props.updateRelationViewState({
            chartState: {
                view: {
                    showConfig: !showChartSettings,
                },
            },
        });
    }

    console.log("ChartSettingsContent", chartExport)

    return <>

        <DropdownMenuLabel>
            Chart Settings
        </DropdownMenuLabel>
        <DropdownMenuSeparator/>

        <DropdownMenuItem
            onClick={() => updateShowConfig()}
        >
            {showChartSettings ? (
                <>
                    <X className="mr-1 h-4 w-4"/> Hide Settings
                </>
            ) : (
                <>
                    <Settings className="mr-1 h-4 w-4"/> Show Settings
                </>
            )}
        </DropdownMenuItem>

        <DropdownMenuSeparator/>
        <DropdownMenuSub>
            <DropdownMenuSubTrigger>
                <Download className="mr-1 h-4 w-4"/> Export chart
                as {chartExport?.exportableChartRef ? 'true' : 'false'} ...
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
                <DropdownMenuItem
                    disabled={!chartExport?.exportableChartRef?.current}
                    onClick={() => chartExport?.exportableChartRef?.current?.exportChartAsPNG?.()}
                >
                    PNG
                </DropdownMenuItem>
                <DropdownMenuItem
                    disabled={!chartExport?.exportableChartRef?.current}
                    onClick={() => chartExport?.exportableChartRef?.current?.exportChartAsSVG?.()}
                >
                    SVG
                </DropdownMenuItem>
            </DropdownMenuSubContent>
        </DropdownMenuSub>
    </>
}
