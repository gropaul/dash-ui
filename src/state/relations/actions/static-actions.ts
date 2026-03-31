import {getInitialParams, getRelationStateFromSource, RelationState} from "@/model/relation-state";
import {getRandomId} from "@/platform/id-utils";
import {getAllRelations} from "@/state/relations/all-relation-utils";
import {Relation, RelationSource, RelationSourceQuery} from "@/model/relation";
import {DATABASE_CONNECTION_ID_DUCKDB_LOCAL} from "@/platform/global-data";
import {getInitViewState, RelationViewType} from "@/model/relation-view-state";
import {getMacroName} from "@/state/relations/sql/table-macros";
import {getInitialAxisDecoration} from "@/model/relation-view-state/chart";
import {RelationEvents} from "@/state/relations/event/relation-events";


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

    static create(options?: { source?: RelationSource; viewType?: RelationViewType }): RelationState {
        const viewType = options?.viewType ?? 'table';
        const randomId = 'relation-' + getRandomId();
        // relation prefix is important as it is e.g. used in
        // src/components/chat/model/chat-context.ts
        const baseQuery = viewType === 'table' ?
            "SELECT 'Hello, World! 🦆' AS message;" :
            "SELECT range as x, x * x as y FROM range(-10,11);";


        const baseSource: RelationSourceQuery = {
            type: "query",
            baseQuery: baseQuery,
            id: randomId    ,
            name: "New Query"
        }
        const source = options?.source ?? baseSource;
        const defaultQueryParams = getInitialParams(viewType);
        const relation: Relation = {
            connectionId: DATABASE_CONNECTION_ID_DUCKDB_LOCAL, id: randomId, source: source
        }

        const uniqueName = RelationActions.getUniqueDisplayName('Element');
        const viewState =  getInitViewState(
            uniqueName,
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
        const relationState: RelationState = {
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
        RelationEvents.create(relationState);
        console.log('Created relation', relationState);
        return relationState;
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

