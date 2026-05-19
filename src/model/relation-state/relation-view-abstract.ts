import {QueryBuildResult, RelationState} from "@/model/relation-state";
import {Column} from "@/model/data-source-connection";
import {buildMacroQuery, buildQuery} from "@/model/relation-state/query-builder";

/**
 * Base class for all relation view types (table, chart, select, slider, text, etc.).
 *
 * @template QueryParameters - Persistent view configuration that is saved across sessions
 *   (e.g., which columns are on the x/y axis of a chart).
 * @template QueryState - Transient user interaction state that lives only during a session
 *   (e.g., the currently selected value in a dashboard dropdown filter).
 *   Defaults to `void` for views that don't have interactive selection state.
 *   Updating this will trigger a re-render of the view as well as any downstream relations.
 */
export abstract class IRelationView<QueryParameters, QueryState = void> {

    // --- QueryParameters: persistent view configuration ---

    getQueryParameters(relation: RelationState): QueryParameters {
        return this.getQueryParametersInternal(relation) ?? this.getInitialQueryParametersInternal();
    }

    abstract getInitialQueryParametersInternal(): QueryParameters;

    abstract getQueryParametersInternal(relation: RelationState): QueryParameters | undefined;

    // Validate and fix parameters against the actual schema (e.g., drop references to columns that no longer exist)
    abstract fixQueryParametersParameters(parameters: QueryParameters, schema: Column[]): QueryParameters;

    // --- QueryState: transient user selection state (defaults provided for views without selection) ---

    getQueryState(relation: RelationState): QueryState {
        return this.getQueryStateInternal(relation) ?? this.getInitialQueryStateInternal();
    }

    getInitialQueryStateInternal(): QueryState {
        return undefined as unknown as QueryState;
    }

    getQueryStateInternal(relation: RelationState): QueryState | undefined {
        return undefined;
    }

    // --- Query builders ---

    // The main data query for this view
    abstract buildViewQuery(parameters: QueryParameters, fromQuery: string, fromAlias: string): string;

    buildMacroQuery(relation: RelationState): string {
        return buildMacroQuery<QueryParameters, QueryState>(relation, this);
    }

    // The query exposed to downstream relations, e.g., a select view adds a WHERE filter
    buildMacroQueryInternal(parameters: QueryParameters, state: QueryState, fromQuery: string, fromAlias: string): string {
        return `SELECT * FROM ${fromQuery}`;
    }

    // The query used to derive the schema via DESCRIBE
    buildSchemaQuery(parameters: QueryParameters, fromQuery: string, fromAlias: string): string {
        return `SELECT * FROM ${fromQuery}`;
    }

    // Optional count query (e.g., for table pagination)
    buildCountQuery(parameters: QueryParameters, fromQuery: string, fromAlias: string): string | undefined {
        return undefined;
    }

    buildQuery(relation: RelationState): Promise<QueryBuildResult> {
        return buildQuery<QueryParameters, QueryState>(relation, this);
    }
}