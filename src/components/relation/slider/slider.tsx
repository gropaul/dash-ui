"use client"

import * as React from "react"
import {Slider as SliderUI} from "@/components/ui/slider"
import {RelationViewContentProps} from "@/components/relation/relation-view-content"
import {isRangeMode} from "@/model/relation-view-state/slider"
import {ViewManager} from "@/model/relation-state/relation-view"
import {getRelationActions} from "@/state/relations/actions/end-user-actions"
import {SliderQueryState} from "@/model/relation-state/relation-view-slider"

export function Slider(props: RelationViewContentProps) {
    return <SliderContent {...props}/>;
}

function deriveDefaultStep(min: number, max: number): number {
    if (Number.isInteger(min) && Number.isInteger(max)) return 1;
    const rawStep = (max - min) / 100;
    return Math.pow(10, Math.round(Math.log10(rawStep)));
}

function SliderContent(props: RelationViewContentProps) {
    const {data} = props;
    const actions = getRelationActions(props);
    const params = ViewManager.instance.slider.getQueryParameters(props.relationState);
    const state = ViewManager.instance.slider.getQueryState(props.relationState);

    if (data.rows.length !== 1 || data.rows[0].length !== 2) {
        return <>Error: Expected one row with two columns (min, max)</>;
    }

    const min = Number(data.rows[0][0]);
    const max = Number(data.rows[0][1]);

    if (isNaN(min) || isNaN(max) || min >= max) {
        return <>Error: Invalid min/max values</>;
    }

    const mode = params.mode ?? 'eq';
    const rangeMode = isRangeMode(mode);
    const step = params.step ?? deriveDefaultStep(min, max);
    const committedValue = deriveSliderValue(state, rangeMode, min, max);

    // Local state for smooth visual feedback while dragging
    const [localValue, setLocalValue] = React.useState<number[]>(committedValue);

    // Sync local value when committed state changes externally (e.g. mode change resets state)
    React.useEffect(() => {
        setLocalValue(committedValue);
    }, [committedValue.join(',')]);

    function onValueCommit(values: number[]) {
        const newState: SliderQueryState = rangeMode
            ? {rangeStart: values[0], rangeEnd: values[1] ?? values[0]}
            : {value: values[0]};
        actions.updateRelationQueryState({slider: newState});
    }

    return (
        <div className="pt-0.5 pb-0.5 px-2 flex flex-row w-full gap-2 items-center justify-start">
            <span className="text-xs text-muted-foreground shrink-0">{min}</span>
            <SliderUI
                mode={mode}
                min={min}
                max={max}
                step={step}
                value={localValue}
                onValueChange={setLocalValue}
                onValueCommit={onValueCommit}
            />
            <span className="text-xs text-muted-foreground shrink-0">{max}</span>
        </div>
    );
}

function deriveSliderValue(
    state: SliderQueryState,
    rangeMode: boolean,
    min: number,
    max: number
): number[] {
    if (rangeMode) {
        return [state.rangeStart ?? min, state.rangeEnd ?? max];
    }
    return [state.value ?? min];
}
