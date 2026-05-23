import {RelationState} from "@/model/relation-state";
import {SELECT_QUERY_LIMIT} from "@/platform/global-data";
import {Column} from "@/model/data-source-connection";
import {IRelationView} from "@/model/relation-state/relation-view-abstract";
import {formatValueForSql} from "@/platform/sql-utils";
import {SelectConfigView} from "@/components/relation/select/select-config-view";

export type SelectType = 'fulltext' | 'select'

// global configuration of the view
export interface SelectQueryParameters {
    column?: string;
    selectType: SelectType;
    placeholder?: string;
    multiSelect?: boolean; // defaults to true
}

// everything local query related, in this case the selected values
export interface SelectQueryState {
    selectedValues: any[]; // raw values the user picked
}

export function getColumnRef(fromAlias: string, column?: string): string {
    return column ? `"${fromAlias}"."${column}"` : '#1';
}

export class RelationViewSelect extends IRelationView<SelectQueryParameters, SelectQueryState> {

    getSettingsComponent() {
        return SelectConfigView;
    }

    getInitialQueryParametersInternal(): SelectQueryParameters {
        return {
            selectType: "select",
            multiSelect: false,
        }
    }

    getQueryParametersInternal(relation: RelationState): SelectQueryParameters | undefined {
        return relation.query.viewParameters.select;
    }

    fixQueryParametersParameters(parameters: SelectQueryParameters, _schema: Column[]): SelectQueryParameters {
        return parameters;
    }

    buildViewQuery(parameters: SelectQueryParameters, fromQuery: string, fromAlias: string) {
        const column_ref = getColumnRef(fromAlias, parameters.column);
        return `SELECT DISTINCT ${column_ref}
                FROM ${fromQuery}
                ORDER BY ${column_ref}
                LIMIT ${SELECT_QUERY_LIMIT};`
    }

    getInitialQueryStateInternal(): SelectQueryState {
        return {selectedValues: []};
    }

    getQueryStateInternal(relation: RelationState): SelectQueryState | undefined {
        return relation?.queryState?.select;
    }

    /**
     * Wraps a base query with a WHERE ... IN filter for the selected values.
     * Returns the plain baseQuery when no selection exists.
     */
    buildMacroQueryInternal(parameters: SelectQueryParameters, state: SelectQueryState, fromQuery: string, fromAlias: string): string {
        if (state.selectedValues.length === 0) {
            return `SELECT *
                    FROM ${fromQuery}`
        }
        const column_ref = getColumnRef(fromAlias, parameters.column);

        const vals = state.selectedValues.map(formatValueForSql).join(', ');
        return `SELECT *
                FROM ${fromQuery}
                WHERE ${column_ref} IN (${vals})`;
    }
}