/**
 * Parameter types for SQL query parameters.
 * Parameters are placeholders like {{param_name}} in SQL queries.
 */

export type ParameterType = 'string' | 'integer' | 'float' | 'date' | 'boolean';

export interface ParameterDefinition {
    name: string;
    description?: string;
    defaultValue?: string;
    type: ParameterType;        // default: 'string'
}

export interface ParameterPanelState {
    show: boolean;
    sizePercentage: number;
}

export interface ParametersState {
    panelState: ParameterPanelState;
    parameters: ParameterDefinition[];
}

export function getInitialParametersState(): ParametersState {
    return {
        panelState: {
            show: true,
            sizePercentage: 30,
        },
        parameters: [],
    };
}

export function createParameter(name: string): ParameterDefinition {
    return {
        name,
        type: 'string',
    };
}

/**
 * Infer parameter type from a value string.
 */
export function inferParameterType(value: string): ParameterType {
    if (value === '') {
        return 'string';
    }

    // Check for boolean
    const lowerValue = value.toLowerCase();
    if (lowerValue === 'true' || lowerValue === 'false') {
        return 'boolean';
    }

    // Check for integer
    if (/^-?\d+$/.test(value)) {
        return 'integer';
    }

    // Check for float
    if (/^-?\d+\.\d+$/.test(value)) {
        return 'float';
    }

    // Check for date (ISO format: YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return 'date';
    }

    return 'string';
}
