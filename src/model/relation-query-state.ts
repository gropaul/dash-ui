import {SelectQueryState} from "@/model/relation-state/relation-view-select";
import {SliderQueryState} from "@/model/relation-state/relation-view-slider";

export interface RelationQueryState {
    select?: SelectQueryState;
    slider?: SliderQueryState;
}
