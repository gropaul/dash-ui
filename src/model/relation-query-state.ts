import {SelectQueryState} from "@/model/relation-state/relation-view-select";
import {SliderQueryState} from "@/model/relation-state/relation-view-slider";
import {ChartQueryState} from "@/model/relation-state/relation-view-chart";

export interface RelationQueryState {
    select?: SelectQueryState;
    slider?: SliderQueryState;
    chart?: ChartQueryState;
}
