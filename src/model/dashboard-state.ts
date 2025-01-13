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
    elements: { [key: string]: DashboardElement };
    elementsOrder: string[];
    viewState: DashboardViewState;
}

export type DashboardElementType = 'text' | 'data';


// type map from DashboardElementType to the corresponding element type
export interface DashboardElementMap {
    'text': DashboardElementText;
    'data': DashboardElementData;
}

export type DashboardElement = DashboardElementMap[DashboardElementType];

export interface DashboardElementBase {
    type: DashboardElementType;
    subtype: ElementSubType;
    id: string;
}

export type ElementSubType = 'text-default' | 'text-h3' | 'data-table' | 'data-chart' | 'data-map';

export interface ElementSubTypeOption {
    value: ElementSubType;
    label: string;
}

export const TYPE_OPTIONS_TEXT: ElementSubTypeOption[] = [
    {value: 'text-default', label: 'Text'},
    {value: 'text-h3', label: 'Small Heading'},
];

export const TYPE_OPTIONS_DATA: ElementSubTypeOption[] = [
    {value: 'data-table', label: 'Table'},
    {value: 'data-chart', label: 'Chart'},
];


export interface DashboardElementText extends DashboardElementBase {
    type: 'text';
    text: string;
}


export interface DashboardElementData extends DashboardElementBase {
    type: 'data';
    data: RelationState;
}


export async function getInitialElement(type: DashboardElementType): Promise<DashboardElementMap[typeof type]> {
    switch (type) {
        case 'text':
            return {
                text: '',
                type: 'text',
                subtype: 'text-default',
                id: getRandomId(),
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
                subtype: 'data-table',
                id: randomId,
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
