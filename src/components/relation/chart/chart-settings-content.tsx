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
            Chart
        </DropdownMenuLabel>

        <DropdownMenuItem
            onClick={() => updateShowConfig()}
        >
            {showChartSettings ? (
                <>
                    <X className="mr-1 h-4 w-4"/> Hide Configuration
                </>
            ) : (
                <>
                    <Settings className="mr-1 h-4 w-4"/> Configure
                </>
            )}
        </DropdownMenuItem>
        <DropdownMenuSub>
            <DropdownMenuSubTrigger>
                <Download className="mr-1 h-4 w-4"/> Export as  ...
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
