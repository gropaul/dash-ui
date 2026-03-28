import {getInitialParams, getRelationStateFromSource, RelationState} from "@/model/relation-state";
import {getRandomId} from "@/platform/id-utils";
import {getAllRelations} from "@/state/relations/all-relation-utils";
import {RelationSource} from "@/model/relation";


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

    static create(param_source?: RelationSource): RelationState {
        const local_source: RelationSource = {
            type: "query",
            baseQuery:  "SELECT 'Hello, World! 🦆' AS message;",
            id: getRandomId(),
            name: "New Query"
        }
        const source = param_source || local_source;
        const defaultQueryParams = getInitialParams('table');
        const connectionId = 'local';
        return getRelationStateFromSource(connectionId, source, defaultQueryParams);
    }

    static isDisplayNameTaken = (displayName: string, excludeRelationId?: string): boolean => {
        return getAllRelations().some(
            ({ relation }) => relation.viewState.displayName === displayName && relation.id !== excludeRelationId
        );
    }

    static getUniqueDisplayName = (desiredName: string, excludeRelationId?: string): string => {
        if (!RelationActions.isDisplayNameTaken(desiredName, excludeRelationId)) {
            return desiredName;
        }
        const base = desiredName.replace(/ \(\d+\)$/, '');
        let counter = 2;
        while (RelationActions.isDisplayNameTaken(`${base} (${counter})`, excludeRelationId)) {
            counter++;
        }
        return `${base} (${counter})`;
    }
}