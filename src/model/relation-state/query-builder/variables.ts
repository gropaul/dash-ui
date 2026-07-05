import {ParameterDefinition} from "@/model/relation-view-state/parameters";

export const getVariablesUsedByQuery = (query: string): string[] => {
    // find all matches of {{variable}}
    const regex = /{{([^}]+)}}/g;
    const matches = query.match(regex);
    if (!matches) {
        return [];
    }

    // remove the {{ and }} from the matches
    return matches.map(match => match.replace(/{{|}}/g, '').trim());
}

export const setVariablesInQuery = (query: string, paramDefs?: ParameterDefinition[]): string => {

    // find all matches of {{variable}}
    const regex = /{{([^}]+)}}/g;
    const matches = query.match(regex);
    if (!matches) {
        return query;
    }

    // Build a map of parameter definitions for quick lookup
    const paramDefMap = new Map<string, ParameterDefinition>();
    for (const p of paramDefs ?? []) {
        paramDefMap.set(p.name, p);
    }

    // replace all matches with the value of the variable
    let newQuery = query;
    for (const match of matches) {
        const variable = match.replace(/{{|}}/g, '').trim();
        const paramDef = paramDefMap.get(variable);
        if (paramDef?.defaultValue !== undefined) {
            newQuery = newQuery.replace(match, paramDef.defaultValue);
            continue;
        }

        // No value available - throw error
        throw new Error(`Parameter '${variable}' has no value. Set a default value in the Parameters panel or provide an input.`);
    }
    return newQuery;
}
