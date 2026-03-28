import {getInitialParams, getRelationStateFromSource, RelationState} from "@/model/relation-state";
import {getRandomId} from "@/platform/id-utils";
import {getAllRelations} from "@/state/relations/all-relation-utils";
import {RelationSource} from "@/model/relation";
import {DATABASE_CONNECTION_ID_DUCKDB_LOCAL} from "@/platform/global-data";
import {RelationViewType} from "@/model/relation-view-state";


function isDisplayNameTaken(displayName: string, excludeRelationId?: string): boolean {
    return getAllRelations().some(
        ({relation}) => relation.viewState.displayName === displayName && relation.id !== excludeRelationId
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

    static create(param_source?: RelationSource, view_type?: RelationViewType): RelationState {
        const local_source: RelationSource = {
            type: "query",
            baseQuery: "SELECT 'Hello, World! 🦆' AS message;",
            id: getRandomId(),
            name: "New Query"
        }
        const source = param_source || local_source;
        const defaultQueryParams = getInitialParams(view_type || 'table');
        return getRelationStateFromSource(DATABASE_CONNECTION_ID_DUCKDB_LOCAL, source, defaultQueryParams);
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

