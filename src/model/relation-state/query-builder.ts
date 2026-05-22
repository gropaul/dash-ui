import {addSemicolonIfNeeded, cleanAndSplitSQL, removeSemicolon, turnQueryIntoSubquery} from "@/platform/sql-utils";
import {QueryBuildResult, RelationState} from "@/model/relation-state";
import {setVariablesInQuery} from "@/model/relation-state/query-builder/variables";
import {getQuerySchema} from "@/model/relation-state/query-builder/schema";
import {IRelationView} from "@/model/relation-state/relation-view-abstract";

const QUERY_ALIAS = 'dash_final_query'

interface QuerySplitResult {
    initialQueries: string[];
    finalQuery: string;
    finalQueryAsSubQuery: string;
}

function splitBaseQuery(baseQuery: string): QuerySplitResult {
    const baseQueries = cleanAndSplitSQL(baseQuery);

    const initialQueries = baseQueries.slice(0, -1);
    // console.log('Base Queries:', baseQueries);
    const finalQuery = removeSemicolon(baseQueries.at(-1) || '');
    if (!finalQuery) {
        throw new Error('No final query found in base SQL');
    }

    // Turn a final query into a subquery

    const finalQueryAsSubQuery = turnQueryIntoSubquery(finalQuery, QUERY_ALIAS);
    return {
        initialQueries,
        finalQuery,
        finalQueryAsSubQuery: finalQueryAsSubQuery,
    }
}

export async function buildQuery<QueryParameters, QueryState>(
    relationState: RelationState,
    relationView: IRelationView<QueryParameters, QueryState>,
): Promise<QueryBuildResult> {

    const paramDefs = relationState.viewState.parametersState?.parameters;
    const sqlWithVariables = setVariablesInQuery(relationState.query.activeBaseQuery, paramDefs);
    const {initialQueries, finalQuery, finalQueryAsSubQuery} = splitBaseQuery(sqlWithVariables);

    const parameters = relationView.getQueryParameters(relationState);
    let schemaQuery = relationView.buildSchemaQuery(parameters, finalQueryAsSubQuery, QUERY_ALIAS);
    console.log('Test: Schema Query:', schemaQuery);
    const schema = await getQuerySchema(schemaQuery);
    const fixedParameters = relationView.fixQueryParametersParameters(parameters, schema);


    const viewQuery = relationView.buildViewQuery(fixedParameters, finalQueryAsSubQuery, QUERY_ALIAS);

    console.log('Test: View Query:', viewQuery);


    let countQuery = undefined;
    if (relationView.buildCountQuery) {
        countQuery = relationView.buildCountQuery(fixedParameters, finalQueryAsSubQuery, QUERY_ALIAS);
    }

    console.log('Test: Count Query:', countQuery);
    console.log('Test: Schema:', schema);


    return {
        initialQueries,
        finalQuery,
        viewQuery,
        countQuery,
        schema,
    };
}


export function buildMacroQuery<QueryParameters, QueryState>(
    relationState: RelationState,
    relationView: IRelationView<QueryParameters, QueryState>,
): string {
    const parameters = relationView.getQueryParameters(relationState);
    const state = relationView.getQueryStateInternal(relationState) || relationView.getInitialQueryStateInternal();

    const {initialQueries, finalQueryAsSubQuery} = splitBaseQuery(relationState.query.baseQuery);
    console.log('Test: Macro Relation State:', relationState);
    let macroQuery = relationView.buildMacroQueryInternal(parameters, state, finalQueryAsSubQuery, QUERY_ALIAS);
    console.log('Test: Macro Query:', macroQuery);
    macroQuery = addSemicolonIfNeeded(macroQuery)
    return [...initialQueries, macroQuery].join('\n');
}