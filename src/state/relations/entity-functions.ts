import {RelationZustand} from "@/state/relations.state";
import {RelationState} from "@/model/relation-state";
import {WorkflowState} from "@/model/workflow-state";
import {DatabaseState} from "@/model/database-state";
import {SchemaState} from "@/model/schema-state";
import {DashboardState} from "@/model/dashboard-state";
import {deepClone} from "@/platform/object-utils";

export type RelationZustandEntityType = 'relations' | 'schemas' | 'databases' | 'dashboards' | 'workflows';

export type RelationZustandEntity =
    RelationState |
    SchemaState |
    DatabaseState |
    DashboardState |
    WorkflowState;

export type RelationZustandEntityCollections =
    { [key: string]: RelationState } |
    { [key: string]: SchemaState } |
    { [key: string]: DatabaseState } |
    { [key: string]: DashboardState } |
    { [key: string]: WorkflowState };

export function IsEntityType(entityType: string): entityType is RelationZustandEntityType {
    return ['relations', 'schemas', 'databases', 'dashboards', 'workflows'].includes(entityType);
}

export function GetEntityTypeDisplayName(entityType: RelationZustandEntityType): string {
    switch (entityType) {
        case 'relations':
            return 'Relation';
        case 'schemas':
            return 'Schema';
        case 'databases':
            return 'Database';
        case 'dashboards':
            return 'Dashboard';
        case 'workflows':
            return 'Workflow';
        default:
            throw new Error(`Unknown entity type: ${entityType}`);
    }
}

export function getEntityCollection(
    state: RelationZustand,
    entityType: RelationZustandEntityType): RelationZustandEntityCollections {
    if (!(entityType in state)) {
        throw new Error(`Entity type ${entityType} does not exist in the state`);
    }
    return state[entityType];
}

export function GetEntityDisplayName(id: string, entityType: RelationZustandEntityType, state: RelationZustand): string {
    const collection = state[entityType];
    const entity = collection[id];

    // check if they have a field viewState
    if (entity && 'viewState' in entity && entity.viewState) {
        return entity.viewState.displayName;
    } else if (entity && 'name' in entity) {
        return entity.name;
    }

    throw new Error(`Entity with id ${id} not found in ${entityType} collection`);
}

export function SetEntityDisplayName(id: string, entityType: RelationZustandEntityType, displayName: string, state: RelationZustand): RelationZustandEntity {
    const collection = state[entityType];
    const entity = deepClone(collection[id]);

    if (!entity) {
        throw new Error(`Entity with id ${id} not found in ${entityType} collection`);
    }

    // check if they have a field viewState
    if ('viewState' in entity && entity.viewState) {
        entity.viewState.displayName = displayName;
    } else if ('name' in entity) {
        entity.name = displayName;
    } else {
        throw new Error(`Entity with id ${id} does not have a display name field`);
    }

    return entity;
}

// returns the cloned collection of the entity type
export function deleteFromEntityCollection(
    state: RelationZustand,
    entityType: RelationZustandEntityType,
    entityId: string): RelationZustandEntityCollections {
    const collection = getEntityCollection(state, entityType);
    const newCollection = {...collection};
    if (newCollection[entityId]) {
        delete newCollection[entityId];
    } else {
        throw new Error(`Entity with id ${entityId} not found in ${entityType} collection`);
    }
    return newCollection;
}