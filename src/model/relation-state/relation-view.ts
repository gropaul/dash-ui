import {QueryBuildResult, RelationState, RelationQueryParameters,} from "@/model/relation-state";
import {RelationViewTable} from "@/model/relation-state/relation-view-table";
import {RelationViewType} from "@/model/relation-view-state";
import {RelationViewChart} from "@/model/relation-state/relation-view-chart";
import {RelationViewSelect} from "@/model/relation-state/relation-view-select";
import {IRelationView} from "@/model/relation-state/relation-view-abstract";
import {RelationViewSlider} from "@/model/relation-state/relation-view-slider";
import {RelationViewText} from "@/model/relation-state/relation-view-text";
import type {ComponentType} from "react";
import {expandPageRefs, missingRefs} from "@/state/relations/sql/page-refs";

// singleton class, all RelationViews need to be registered here
export class ViewManager {
    private static _instance: ViewManager | undefined;

    private readonly views: { [K in RelationViewType]: IRelationView<any, any> };

    table: RelationViewTable;
    chart: RelationViewChart;
    map: RelationViewTable;
    select: RelationViewSelect;
    text: RelationViewText;
    slider: RelationViewSlider;

    private constructor() {
        // All view instances created once, on first use
        this.table = new RelationViewTable();
        this.chart = new RelationViewChart();
        this.map = new RelationViewTable();
        this.select = new RelationViewSelect();
        this.text = new RelationViewText();
        this.slider = new RelationViewSlider();

        this.views = {
            table: this.table,
            chart: this.chart,
            map: this.map,
            select: this.select,
            text: this.text,
            slider: this.slider
        };
    }

    getInitialQueryParameters(): RelationQueryParameters {
        return {
            type: "table",
            table: this.table.getInitialQueryParametersInternal(),
        }
    }

    static get instance(): ViewManager {
        return (this._instance ??= new ViewManager());
    }

    async buildQuery(relation: RelationState): Promise<QueryBuildResult> {
        const viewType = relation.viewState.selectedView;
        // A ref to a query or block that isn't there would fail as an unknown macro; say what is missing instead.
        const missing = missingRefs(relation.id, relation.query.activeBaseQuery);
        if (missing.length > 0) throw new Error(`${missing.join(', ')} not found`);
        const activeBaseQuery = await expandPageRefs(relation.id, relation.query.activeBaseQuery, r => this.buildMacroQuery(r));
        return this.views[viewType].buildQuery({...relation, query: {...relation.query, activeBaseQuery}});
    }

    buildMacroQuery(relation: RelationState):  Promise<string> {
        const viewType = relation.viewState.selectedView;
        return this.views[viewType].buildMacroQuery(relation);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getSettingsComponent(viewType: RelationViewType): ComponentType<any> | null {
        return this.views[viewType].getSettingsComponent();
    }

}