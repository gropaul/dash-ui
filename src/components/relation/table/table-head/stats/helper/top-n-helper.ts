import {LerpColorHex} from "@/platform/colors-utils";
import {TopNItem, TopNItemTransformed} from "@/components/relation/table/table-head/stats/column-stats-view-top-n";

const startColor = "#afc9ff";
const endColor = "#e6eeff";
const colorSelected = "#ff7d7d";

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

/// Adds others, Transforms all values to strings, set unselected items count to 0, sorts by count descending
export function PreprocessRawData(topValues: TopNItem[], selectedStrings: string[], othersCount?: number): TopNItemTransformed[] {

    const copy = [...topValues];


    if (othersCount && othersCount > 0) {
        copy.push({value: "Others", count: othersCount});
    }

    const filtered =  copy.map(item => {
        const stringValue = ItemToString(item.value);
        let count = item.count;
        if (selectedStrings.length > 0 && !selectedStrings.includes(stringValue)) {
            count = 0;
        }

        return {
            ...item,
            valueString: stringValue,
            count: count
        }
    });
    filtered.sort((a, b) => a.count - b.count);
    return filtered;
}

export function GetColors(items: TopNItemTransformed[], selectedStrings: string[]) {
    return items.map((item, index) => {
        if (selectedStrings.includes(item.valueString)) {
            return colorSelected;
        }

        const t = items.length === 1 ? 0 : index / (items.length - 1);

        if (item.valueString === "Others") return "#efefef";
        if (item.valueString === "null") return "#efefef";
        if (item.valueString === "undefined") return "#efefef";

        return LerpColorHex(startColor, endColor, 1 - t);
    });
}