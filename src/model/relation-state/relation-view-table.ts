import {
    RelationState
} from "@/model/relation-state";
import {Column} from "@/model/data-source-connection";
import {IRelationView} from "@/model/relation-state/relation-view-abstract";
import {TableConfigView} from "@/components/relation/table/table-config-view";

export type ColumnSorting = 'ASC' | 'DESC';

export interface TableQueryParameters {
    offset: number;
    limit: number;
    sorting: { [key: string]: ColumnSorting | undefined };
}

export class RelationViewTable extends IRelationView<TableQueryParameters> {

    getSettingsComponent() {
        return TableConfigView;
    }

    getInitialQueryParametersInternal(): TableQueryParameters {
        return {
            offset: 0,
            limit: 100,
            sorting: {},
        }
    }

    getQueryParametersInternal(relation: RelationState): TableQueryParameters  | undefined{
        return relation.query.viewParameters.table;
    }

    fixQueryParametersParameters(parameters: TableQueryParameters, schema: Column[]): TableQueryParameters {
        return parameters;
    }

    buildViewQuery(parameters: TableQueryParameters, fromQuery: string, fromAlias: string) {
        const {offset, limit} = parameters;

        // Build "ORDER BY ..." from query.sorting
        const orderByColumns = Object.entries(parameters.sorting)
            .map(([column, sorting]) => (sorting ? `"${column}" ${sorting}` : ''))
            .filter(Boolean)
            .join(', ');

        const orderByQuery = orderByColumns ? 'ORDER BY ' + orderByColumns : '';
        return `
            SELECT *
            FROM ${fromQuery} ${orderByQuery}
            LIMIT ${limit} OFFSET ${offset};
        `;
    }

    buildCountQuery(parameters: TableQueryParameters, fromQuery: string, fromAlias: string) {
        return `
            SELECT COUNT(*)
            FROM ${fromQuery};
        `;
    }
}
