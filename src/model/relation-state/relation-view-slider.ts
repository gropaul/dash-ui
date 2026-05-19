import {RelationState} from "@/model/relation-state";
import {Column} from "@/model/data-source-connection";
import {isNumeric} from "@/model/relation-view-state/column-utils";
import {QueryBuildError} from "@/model/relation-state/query-builder/build-error";
import {IRelationView} from "@/model/relation-state/relation-view-abstract";
import {isRangeMode, SliderMode} from "@/model/relation-view-state/slider";

// Persistent view config — saved across sessions
export interface SliderQueryParameters {
    column?: string;
    mode?: SliderMode;   // defaults to 'eq'
    step?: number;
}

// Transient selection state — resets on query re-run
export interface SliderQueryState {
    value?: number;          // used by eq / lower / higher
    rangeStart?: number;     // used by in_range / out_range
    rangeEnd?: number;
}

export class RelationViewSlider extends IRelationView<SliderQueryParameters, SliderQueryState> {

    getInitialQueryParametersInternal(): SliderQueryParameters {
        return {mode: 'eq', step: 1};
    }

    getQueryParametersInternal(relation: RelationState): SliderQueryParameters | undefined {
        return relation.query.viewParameters.slider;
    }

    fixQueryParametersParameters(parameters: SliderQueryParameters, schema: Column[]): SliderQueryParameters {
        const numericColumns = schema.filter(isNumeric);
        if (numericColumns.length === 0) {
            throw new QueryBuildError('No numeric columns found in the schema');
        }
        if (!parameters.column || !numericColumns.some(c => c.name === parameters.column)) {
            parameters.column = numericColumns[0].name;
        }
        return parameters;
    }

    buildViewQuery(parameters: SliderQueryParameters, fromQuery: string, fromAlias: string): string {
        const col = parameters.column
            ? `"${fromAlias}"."${parameters.column}"`
            : `"${fromAlias}".__unknown__`;
        return `SELECT MIN(${col}) as global_min, MAX(${col}) as global_max FROM ${fromQuery}`;
    }

    getInitialQueryStateInternal(): SliderQueryState {
        return {};
    }

    getQueryStateInternal(relation: RelationState): SliderQueryState | undefined {
        return relation.queryState?.slider;
    }

    buildMacroQueryInternal(
        parameters: SliderQueryParameters,
        state: SliderQueryState,
        fromQuery: string,
        _fromAlias: string
    ): string {
        const mode = parameters.mode ?? 'eq';
        const col = parameters.column;

        if (!col) return `SELECT * FROM ${fromQuery}`;

        const q = `"${col}"`;

        if (!isRangeMode(mode)) {
            if (state.value === undefined) return `SELECT * FROM ${fromQuery}`;
            const v = state.value;
            const opMap: Record<string, string> = {eq: '=', lower: '<=', higher: '>='};
            return `SELECT * FROM ${fromQuery} WHERE ${q} ${opMap[mode]} ${v}`;
        } else {
            if (state.rangeStart === undefined || state.rangeEnd === undefined) {
                return `SELECT * FROM ${fromQuery}`;
            }
            const between = `${q} BETWEEN ${state.rangeStart} AND ${state.rangeEnd}`;
            const condition = mode === 'in_range' ? between : `NOT (${between})`;
            return `SELECT * FROM ${fromQuery} WHERE ${condition}`;
        }
    }
}
