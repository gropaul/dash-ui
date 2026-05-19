import {RelationState} from "@/model/relation-state";
import {Column} from "@/model/data-source-connection";
import {IRelationView} from "@/model/relation-state/relation-view-abstract";

export interface TextViewParameters {
    titleColumn?: string;
    subtitleColumn?: string;
}

export class RelationViewText extends IRelationView<TextViewParameters> {

    getInitialQueryParametersInternal(): TextViewParameters {
        return {};
    }

    getQueryParametersInternal(relation: RelationState): TextViewParameters | undefined {
        return relation.query.viewParameters.text;
    }

    fixQueryParametersParameters(parameters: TextViewParameters, schema: Column[]): TextViewParameters {
        // check if title and subtitle columns exist
        if (!parameters.titleColumn || !schema.some(col => col.name === parameters.titleColumn)) {
            parameters.titleColumn = schema[0]?.name || undefined;
        }
        if (!parameters.subtitleColumn || !schema.some(col => col.name === parameters.subtitleColumn)) {
            parameters.subtitleColumn = schema[1]?.name || undefined;
        }

        return parameters;

    }

    buildViewQuery(parameters: TextViewParameters, fromQuery: string, fromAlias: string) {
        const titleRef = parameters.titleColumn ? `"${fromAlias}"."${parameters.titleColumn}"` : '#1';
        // if there is no subtitle column, just use an empty string
        const subtitleRef = parameters.subtitleColumn ? `"${fromAlias}"."${parameters.subtitleColumn}"` : "''"
        return `SELECT ${titleRef}, ${subtitleRef}
                FROM ${fromQuery} LIMIT 1;`
    }
}
