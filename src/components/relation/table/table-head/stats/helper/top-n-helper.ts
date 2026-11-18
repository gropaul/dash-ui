import {LerpColorHex} from "@/platform/colors-utils";
import {TopNItem, TopNItemTransformed} from "@/components/relation/table/table-head/stats/column-stats-view-top-n";

// With a pick, as the histogram's range: the picked values in the strongest blue, the rest in gray, dark to light as
// the blue runs without one. In dark mode the bars run from bright to dim instead.
const PALETTES = {
    light: {start: "#afc9ff", end: "#e6eeff", unpickedStart: "#d1d5db", unpickedEnd: "#f3f4f6", rest: "#efefef"},
    dark: {start: "#2f5fb3", end: "#1c2b4a", unpickedStart: "#4b5563", unpickedEnd: "#272b33", rest: "#2a2e35"},
};

export function ItemToString(value: any): string {
    return value === null
        ? "null"
        : value === undefined
            ? "undefined"
            : String(value);
}

export function ToggleSelected(selected: any[], selectedStrings: string[], value: any): any[] {
    const valueString = ItemToString(value);
    const copy = [...selected];
    if (selectedStrings.includes(valueString)) {
        // remove value from selected
        const index = copy.findIndex(item => ItemToString(item) === valueString);
        if (index !== -1) {
            copy.splice(index, 1);
        }
    } else {
        // add value to selected
        copy.push(value);
    }
    return copy;
}

/// Adds others, transforms all values to strings, sorts by count ascending. The picked values keep their place among the
/// rest (colored by GetColors): the stats show the whole query, a pick filters only the views on top of it.
export function PreprocessRawData(topValues: TopNItem[], selectedStrings: string[], othersCount?: number): TopNItemTransformed[] {

    const filtered: TopNItemTransformed[] = topValues.map(item => ({...item, valueString: ItemToString(item.value)}));
    if (othersCount && othersCount > 0) {
        filtered.push({value: "Others", count: othersCount, valueString: "Others", isOthers: true});
    }
    filtered.sort((a, b) => a.count - b.count);
    return filtered;
}

export function GetColors(items: TopNItemTransformed[], selectedStrings: string[], dark = false) {
    const palette = dark ? PALETTES.dark : PALETTES.light;
    return items.map((item, index) => {
        const t = items.length === 1 ? 0 : index / (items.length - 1);

        if (selectedStrings.length > 0) {
            return selectedStrings.includes(item.valueString) ? palette.start : LerpColorHex(palette.unpickedStart, palette.unpickedEnd, 1 - t);
        }

        if (item.isOthers) return palette.rest;
        if (item.valueString === "null") return palette.rest;
        if (item.valueString === "undefined") return palette.rest;

        return LerpColorHex(palette.start, palette.end, 1 - t);
    });
}
