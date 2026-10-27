import {getBaseQueryFromSource, RelationState} from "@/model/relation-state";
import {getRandomId} from "@/platform/id-utils";
import {
    getRelationIdFromSource,
    getRelationNameFromSource,
    Relation,
    RelationSource,
    RelationSourceQuery
} from "@/model/relation";
import {DATABASE_CONNECTION_ID_DUCKDB_LOCAL} from "@/platform/global-data";
import {getInitViewState, RelationViewType} from "@/model/relation-view-state";
import {getInitialAxisDecoration} from "@/model/relation-view-state/chart";
import {ConnectionsService} from "@/state/connections/connections-service";
import {ViewManager} from "@/model/relation-state/relation-view";
import {getInitialChartQueryParameters} from "@/model/relation-state/relation-view-chart";


export class RelationActions {

    static create(options?: { connectionId?: string, source?: RelationSource; viewType?: RelationViewType, showCode?: boolean}): RelationState {

        const showCode = options?.showCode ?? true;
        const viewType = options?.viewType ?? 'table';
        const fallbackBaseQuery = viewType === 'table' ?
            "SELECT 'Hello, World! 🦆' AS message;" :
            "SELECT range as x, x * x as y FROM range(-10,11);";

        const baseSource: RelationSourceQuery = {
            type: "query",
            baseQuery: fallbackBaseQuery,
            id: getRandomId()    ,
            name: "Element"
        }
        const source = options?.source ?? baseSource;
        let fallbackConnectionId = DATABASE_CONNECTION_ID_DUCKDB_LOCAL;
        if (ConnectionsService.getInstance().hasDatabaseConnection()){
            fallbackConnectionId = ConnectionsService.getInstance().getDatabaseConnection().id
        }
        const connectionId = options?.connectionId ?? fallbackConnectionId;
        const relationId = getRelationIdFromSource(connectionId, source);

        const relation: Relation = {
            connectionId: DATABASE_CONNECTION_ID_DUCKDB_LOCAL, id: relationId, source: source
        }

        const viewState =  getInitViewState(
            getRelationNameFromSource(source),
            undefined,
            [],
            showCode
        );
        viewState.selectedView = viewType;
        const baseQuery = getBaseQueryFromSource(source);
        let params = ViewManager.instance.getInitialQueryParameters();
        params.type = viewType;
        if (viewType === 'chart') {
            const chartParams = getInitialChartQueryParameters();
            chartParams.plot.type = 'line';
            chartParams.plot.cartesian.xAxis = {columnId: 'x', decoration: getInitialAxisDecoration(0)};
            chartParams.plot.cartesian.yAxes = [{columnId: 'y', decoration: getInitialAxisDecoration(1)}];
            params.chart = chartParams;
        }
        const relationState: RelationState = {
            ...relation,
            query: {
                activeBaseQuery: baseQuery,
                baseQuery: baseQuery,
                viewParameters: params,
            },
            viewState,
            executionState: {
                state: "not-started"
            }
        };
        return relationState;
    }
}
