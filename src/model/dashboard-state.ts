import {getDefaultQueryParams, getQueryFromParams, RelationState} from "@/model/relation-state";
import {getInitialTabViewBaseState, getInitViewState, TabViewBaseState} from "@/model/relation-view-state";
import {Relation, RelationSourceQuery} from "@/model/relation";
import {getRandomId} from "@/platform/id-utils";
import {CONNECTION_ID_DUCKDB_LOCAL} from "@/platform/global-data";

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
    elements: DashboardElement[];
    viewState: DashboardViewState;
}

export type DashboardElementType = 'text' | 'data';

export interface DashboardElement {
    type: DashboardElementType;
}

export interface DashboardElementText extends DashboardElement {
    type: 'text';
    // markdown formatted
    text: string;
}

export interface DashboardElementData extends DashboardElement {
    type: 'data';
    data: RelationState;
}

// type map from DashboardElementType to the corresponding element type
export interface DashboardElementMap {
    'text': DashboardElementText;
    'data': DashboardElementData;
}

export async function getInitialElement(type: DashboardElementType): Promise<DashboardElementMap[typeof type]> {
    switch (type) {
        case 'text':
            return {
                type: 'text',
                text: ''
            };
        case 'data':
            const randomId = getRandomId();
            const baseQuery = "SELECT 'Hello, World! 🦆' AS message;";
            const source: RelationSourceQuery = {
                type: "query",
                baseQuery: baseQuery,
                id: randomId,
                name: "New Query"
            }
            const defaultQueryParams = getDefaultQueryParams();
            const relation: Relation = {
                connectionId: CONNECTION_ID_DUCKDB_LOCAL, id: randomId, name: "New Query", source: source
            }
            const query = await getQueryFromParams(relation, defaultQueryParams, baseQuery)
            return {
                type: 'data',
                data: {
                    ...relation,
                    query: query,
                    viewState: getInitViewState(
                        'New Data Element',
                        undefined,
                        true
                    ),
                    executionState: {
                        state: "not-started"
                    }
                }
            };
        default:
            throw new Error(`Unsupported type: ${type}`); // Handle unsupported types
    }
}
