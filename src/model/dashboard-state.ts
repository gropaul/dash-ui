import {getInitialParams} from "@/model/relation-state";
import {
    getInitialTabViewBaseState,
    getInitViewState,
    RelationViewType,
    TabViewBaseState
} from "@/model/relation-view-state";
import {Relation, RelationSourceQuery} from "@/model/relation";
import {getRandomId} from "@/platform/id-utils";
import {DATABASE_CONNECTION_ID_DUCKDB_LOCAL} from "@/platform/global-data";
import {OutputData} from "@editorjs/editorjs";
import {RelationBlockData} from "@/components/editor/tools/relation.tool";
import {getInitialAxisDecoration} from "@/model/relation-view-state/chart";

export interface DashboardViewState extends TabViewBaseState {

}

export function getInitDashboardViewState(displayName: string): DashboardViewState {
    return {
        ...getInitialTabViewBaseState(displayName),
    };
}

export interface DashboardState {
    id: string;
    name: string;
    elementState?: OutputData;
    viewState: DashboardViewState;
}


export function getInitialDataElement(viewType: RelationViewType): RelationBlockData {

    const randomId = getRandomId();
    const baseQuery = viewType === 'table' ?
        "SELECT 'Hello, World! 🦆' AS message;" :
        "SELECT range as x, x * x as y FROM range(-10,11);";

    const source: RelationSourceQuery = {
        type: "query",
        baseQuery: baseQuery,
        id: randomId,
        name: "New Query"
    }
    const defaultQueryParams = getInitialParams(viewType);
    const relation: Relation = {
        connectionId: DATABASE_CONNECTION_ID_DUCKDB_LOCAL, id: randomId, name: "New Query", source: source
    }

    const viewState =  getInitViewState(
            'New Data Element',
            undefined,
            [],
            true
        );
    viewState.selectedView = viewType;
    if (viewType === 'chart') {
        viewState.chartState.chart.plot.cartesian.xAxis = {
            label: 'x',
            columnId: 'x',
            decoration: getInitialAxisDecoration(0)
        }
        viewState.chartState.chart.plot.cartesian.yAxes = [{
            label: 'y',
            columnId: 'y',
            decoration: getInitialAxisDecoration(1)
        }];
        viewState.chartState.chart.plot.type = 'line';
        viewState.chartState.chart.plot.cartesian.xAxisType = 'value';
        viewState.chartState.view.showConfig = false;
    }
    return {
        ...relation,
        query: {
            baseQuery: baseQuery,
            activeBaseQuery: baseQuery,
            viewParameters: defaultQueryParams
        },
        viewState,
        executionState: {
            state: "not-started"
        }
    };
}