import {getBaseQueryFromSource, RelationState} from "@/model/relation-state";
import {getRandomId} from "@/platform/id-utils";
import {getAllRelations} from "@/state/relations/all-relation-utils";
import {
    getRelationIdFromSource,
    getRelationNameFromSource,
    Relation,
    RelationSource,
    RelationSourceQuery
} from "@/model/relation";
import {DATABASE_CONNECTION_ID_DUCKDB_LOCAL} from "@/platform/global-data";
import {getInitViewState, RelationViewType} from "@/model/relation-view-state";
import {getMacroName} from "@/state/relations/sql/table-macros";
import {getInitialAxisDecoration} from "@/model/relation-view-state/chart";
import {RelationEvents} from "@/state/relations/event/relation-events";
import {ConnectionsService} from "@/state/connections/connections-service";
import {ViewManager} from "@/model/relation-state/relation-view";
import {getInitialChartQueryParameters} from "@/model/relation-state/relation-view-chart";


function isDisplayNameTaken(displayName: string, excludeRelationId?: string): boolean {
    const macro = getMacroName(displayName);
    return getAllRelations().some(
        ({relation}) => relation.id !== excludeRelationId && getMacroName(relation.viewState.displayName) === macro
    );
}

export class RelationActions {

    static copy = (original: RelationState) => {
        const newName = RelationActions.getUniqueDisplayName(original.viewState.displayName + ' Copy');
        return {
            ...original,
            id: getRandomId(),
            name: newName,
            viewState: {
                ...original.viewState,
                displayName: newName,
            }
        };
    }

    static create(options?: { connectionId?: string, source?: RelationSource; viewType?: RelationViewType, showCode?: boolean}): RelationState {

        const showCode = options?.showCode ?? true;
        const viewType = options?.viewType ?? 'table';
        // relation prefix is important as it is e.g. used in
        // src/components/chat/model/chat-context.ts
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

        const desiredName = getRelationNameFromSource(source);
        const uniqueName = RelationActions.getUniqueDisplayName(desiredName, relationId);
        const viewState =  getInitViewState(
            uniqueName,
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
            chartParams.plot.cartesian.xAxis = {label: 'x', columnId: 'x', decoration: getInitialAxisDecoration(0)};
            chartParams.plot.cartesian.yAxes = [{label: 'y', columnId: 'y', decoration: getInitialAxisDecoration(1)}];
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
        RelationEvents.create(relationState);
        return relationState;
    }

    static renameInQuery(relationState: RelationState, oldStr: string, newStr: string): RelationState {
        const {baseQuery, activeBaseQuery} = relationState.query;
        if (!baseQuery.includes(oldStr) && !activeBaseQuery.includes(oldStr)) return relationState;
        return {
            ...relationState,
            query: {
                ...relationState.query,
                baseQuery: baseQuery.replaceAll(oldStr, newStr),
                activeBaseQuery: activeBaseQuery.replaceAll(oldStr, newStr),
            },
        };
    }

    static renameInAllQueries(oldStr: string, newStr: string, excludeId: string): void {
        for (const entry of getAllRelations()) {
            if (entry.relation.id === excludeId) continue;
            const updated = RelationActions.renameInQuery(entry.relation, oldStr, newStr);
            if (updated !== entry.relation) {
                entry.updateRelation(updated);
            }
        }
    }

    static getUniqueDisplayName = (desiredName: string, excludeRelationId?: string): string => {
        if (!isDisplayNameTaken(desiredName, excludeRelationId)) {
            return desiredName;
        }
        const base = desiredName.replace(/ \(\d+\)$/, '');
        let counter = 2;
        while (isDisplayNameTaken(`${base} (${counter})`, excludeRelationId)) {
            counter++;
        }
        return `${base} (${counter})`;
    }
}

