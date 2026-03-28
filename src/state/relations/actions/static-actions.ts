import {RelationState} from "@/model/relation-state";
import {getRandomId} from "@/platform/id-utils";
import {getAllRelations} from "@/state/relations/all-relation-utils";


export class RelationActions {

    static copy = (original: RelationState) => {
        return {
            ...original,
            id: getRandomId(),
        };
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