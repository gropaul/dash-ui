import {LerpColorHex} from "@/platform/colors-utils";
import {TopNItem, TopNItemTransformed} from "@/components/relation/table/table-head/stats/column-stats-view-top-n";

const startColor = "#afc9ff";
const endColor = "#e6eeff";
// With a pick, as the histogram's range: the picked values in the strongest blue, the rest in gray, dark to light as
// the blue runs without one.
const unpickedStartColor = "#d1d5db";
const unpickedEndColor = "#f3f4f6";

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

export function GetColors(items: TopNItemTransformed[], selectedStrings: string[]) {
    return items.map((item, index) => {
        const t = items.length === 1 ? 0 : index / (items.length - 1);

        if (selectedStrings.length > 0) {
            return selectedStrings.includes(item.valueString) ? startColor : LerpColorHex(unpickedStartColor, unpickedEndColor, 1 - t);
        }

        if (item.isOthers) return "#efefef";
        if (item.valueString === "null") return "#efefef";
        if (item.valueString === "undefined") return "#efefef";

        return LerpColorHex(startColor, endColor, 1 - t);
    });
}