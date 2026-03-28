import { extractParameters } from "@/state/relations/sql/table-macros";
import { ParameterDefinition, createParameter } from "@/model/relation-view-state/parameters";

/**
 * Merge SQL-detected parameters with existing parameter definitions.
 * Preserves metadata (description, defaultValue, type) for existing parameters.
 */
export function mergeParameters(sql: string, existingParams: ParameterDefinition[] | undefined): ParameterDefinition[] {
    const sqlParams = extractParameters(sql ?? '');
    const safeExistingParams = existingParams ?? [];

    const existingByName = new Map<string, ParameterDefinition>();
    for (const param of safeExistingParams) {
        existingByName.set(param.name, param);
    }

    const result: ParameterDefinition[] = [];

    // Create parameters for each SQL param, preserving existing metadata
    for (const paramName of sqlParams) {
        const existing = existingByName.get(paramName);
        if (existing) {
            result.push(existing);
        } else {
            result.push(createParameter(paramName));
        }
    }

    return result;
}

/**
 * Check if parameters have changed (for optimization).
 */
export function parametersEqual(a: ParameterDefinition[] | undefined, b: ParameterDefinition[] | undefined): boolean {
    const safeA = a ?? [];
    const safeB = b ?? [];

    if (safeA.length !== safeB.length) {
        return false;
    }

    for (let i = 0; i < safeA.length; i++) {
        if (
            safeA[i].name !== safeB[i].name ||
            safeA[i].description !== safeB[i].description ||
            safeA[i].defaultValue !== safeB[i].defaultValue ||
            safeA[i].type !== safeB[i].type
        ) {
            return false;
        }
    }

    return true;
}
