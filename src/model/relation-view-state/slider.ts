// 5 flat filter modes — no nested mode/operator structure
export type SliderMode = 'eq' | 'lower' | 'higher' | 'in_range' | 'out_range';

export function isRangeMode(mode: SliderMode): boolean {
    return mode === 'in_range' || mode === 'out_range';
}
