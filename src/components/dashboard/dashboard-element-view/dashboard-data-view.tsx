import {DashboardElementData, ElementSubType, TYPE_OPTIONS_DATA} from "@/model/dashboard-state";
import {RelationStateView} from "@/components/relation/relation-state-view";
import {RelationQueryParams} from "@/model/relation-state";
import {DeepPartial} from "@/platform/object-utils";
import {RelationViewState, RelationViewType} from "@/model/relation-view-state";
import {ViewElementBase, ViewElementBaseProps} from "@/components/dashboard/components/view-element-base";
import {Button} from "@/components/ui/button";
import {Code, Plus, Settings2} from "lucide-react";
import {ContextMenuItem} from "@/components/ui/context-menu";
import {DropdownMenuItem, DropdownMenuSeparator} from "@/components/ui/dropdown-menu";
import {useRelationsState} from "@/state/relations.state";


export interface DashboardDataViewProps {
    dashboardId: string;
    elementIndex: number;
    elementsCount: number;
    element: DashboardElementData;
}

export function DashboardDataView(props: DashboardDataViewProps) {

    const elementId = props.element.id;
    const updateDashboardElementBase = useRelationsState((state) => state.updateDashboardElement);

    function updateDashboardElement(element: DeepPartial<DashboardElementData>) {
        updateDashboardElementBase(props.dashboardId, elementId, element);
    }

    async function updateRelationDataWithParams(_relationId: string, query: RelationQueryParams) {

    }

    function updateRelationBaseQuery(_relationId: string, baseQuery: string) {
        updateDashboardElement({
            data: {
                query: {
                    baseQuery: baseQuery
                }
            }
        })
    }

    function updateRelationViewState(_relationId: string, viewState: DeepPartial<RelationViewState>) {
        updateDashboardElement({
            data: {
                viewState: {
                    ...props.element.data.viewState,
                    ...viewState
                }
            }
        })
    }

    function onToggleShowCode(show: boolean) {
        console.log("onToggleShowCode", show)
        updateRelationViewState('', {
            codeFenceState: {
                show: show
            }
        })
    }

    function onToggleShowChartSettings(show: boolean) {
        console.log("onToggleShowChartSettings", show)
        updateRelationViewState('', {
            chartState: {
                view: {
                    showConfig: show
                }
            }
        })
    }

    function updateElementType(subtype: ElementSubType) {

        // @ts-ignore
        const subTypeViewTypeMap: Record<ElementSubType, RelationViewType> = {
            'data-chart': 'chart',
            'data-table': 'table',
            'data-map': 'map',
        }

        if (!subTypeViewTypeMap[subtype]) {
            throw new Error("Invalid subtype for data view: " + subtype)
        }

        updateDashboardElement({
            subtype: subtype,
            data: {
                viewState: {
                    selectedView: subTypeViewTypeMap[subtype]
                }
            }
        })
    }


    const showCode = props.element.data.viewState.codeFenceState.show
    const showChartSettings = props.element.data.viewState.chartState.view.showConfig

    const label = showCode ? "Hide Query" : "Show Query"
    const labelChartSettings = showChartSettings ? "Hide Chart Settings" : "Show Chart Settings"

    const isChart = props.element.subtype === 'data-chart'

    const baseProps: ViewElementBaseProps = {
        dashboardId: props.dashboardId,
        typeOptions: TYPE_OPTIONS_DATA,
        startIconClass: "h-10",
        element: props.element,
        elementIndex: props.elementIndex,
        elementsCount: props.elementsCount,
        onTypeChangeOverwrite: updateElementType,
        extraContextMenuItems: <>
            <DropdownMenuSeparator/>
            <DropdownMenuItem onClick={() => onToggleShowCode(!showCode)}>
                <Code size={16}/>
                <span>{label}</span>
            </DropdownMenuItem>
            {isChart && (
                <DropdownMenuItem onClick={() => onToggleShowChartSettings(!showChartSettings)}>
                    <Settings2 size={16}/>
                    <span>{labelChartSettings}</span>
                </DropdownMenuItem>
            )}
        </>
    }

    return <ViewElementBase {...baseProps}>
        <RelationStateView
            embedded
            relationState={props.element.data}
            updateRelationDataWithParams={updateRelationDataWithParams}
            updateRelationBaseQuery={updateRelationBaseQuery}
            updateRelationViewState={updateRelationViewState}

        />
    </ViewElementBase>
}