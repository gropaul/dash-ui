// cmdk's default fuzzy scorer, shipped without types. Score is 0 (no match) → 1 (best match);
// `search` matches as an in-order subsequence of `value`, with bonuses for word-boundary/start hits.
declare module "command-score" {
    export default function commandScore(value: string, search: string, keywords?: string[]): number;
}