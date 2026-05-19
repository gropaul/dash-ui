import {
    RelationState
} from "@/model/relation-state";
import {Column} from "@/model/data-source-connection";
import {IRelationView} from "@/model/relation-state/relation-view-abstract";

export type ColumnSorting = 'ASC' | 'DESC';

export type ColumnFilterRange = {
    type: 'range';
    min?: number;
    max?: number;
};

// will convert into an col IN (val1, ...)
export type ColumnFilterIn = {
    type: 'values';
    values: any[];
};

export type ColumnFilter = ColumnFilterRange | ColumnFilterIn;

export interface TableQueryParameters {
    offset: number;
    limit: number;
    sorting: { [key: string]: ColumnSorting | undefined };
    filters: { [key: string]: ColumnFilter | undefined };
}

export class RelationViewTable extends IRelationView<TableQueryParameters> {

    getInitialQueryParametersInternal(): TableQueryParameters {
        return {
            offset: 0,
            limit: 100,
            sorting: {},
            filters: {},
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
        const filterQuery = buildFilterWhereClause(fromAlias, parameters.filters);
        return `
            SELECT *
            FROM ${fromQuery} ${filterQuery} ${orderByQuery}
            LIMIT ${limit} OFFSET ${offset};
        `;
    }

    buildCountQuery(parameters: TableQueryParameters, fromQuery: string, fromAlias: string) {
        const filterQuery = buildFilterWhereClause(fromAlias, parameters.filters);
        return `
            SELECT COUNT(*)
            FROM ${fromQuery} ${filterQuery};
        `;
    }
}

function buildFilterWhereClause(alias: string, filters?: { [key: string]: ColumnFilter | undefined }): string {
    if (!filters) return '';
    const conditions: string[] = [];
    for (const [column, filter] of Object.entries(filters)) {
        if (!filter) continue;
        const colRef = `"${alias}"."${column}"`;
        if (filter.type === 'range') {
            if (filter.min !== undefined) {
                conditions.push(`${colRef} >= ${filter.min}`);
            }
            if (filter.max !== undefined) {
                conditions.push(`${colRef} <= ${filter.max}`);
            }
        } else if (filter.type === 'values') {
            if (filter.values.length > 0) {
                const vals = filter.values
                    .map((v) =>
                        typeof v === 'number'
                            ? v
                            : `'${String(v).replace(/'/g, "''")}'`
                    )
                    .join(', ');
                conditions.push(`${colRef} IN (${vals})`);
            }
        }
    }
    if (conditions.length === 0) return '';
    return 'WHERE ' + conditions.join(' AND ');
}
