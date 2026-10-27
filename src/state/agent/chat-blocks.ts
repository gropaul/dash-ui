import {splitHeader} from "@/state/workspace/header-lines";

/** Whether a fence in an agent's message shows data, by the rule pages use: a `view` or `input` header line. */
export function isChatBlock(language: string | undefined, text: string): boolean {
    if (language !== 'sql') return false;
    const {header} = splitHeader(text);
    return !!header.view || !!header.input;
}

const LEADING_FENCE = /^(\s*)```(\w*)[^\n]*\n([\s\S]*?)\n?```[^\n]*(?:\n|$)/;

/** The data fence a message starts with: its body, and where the fence starts and ends in the message. */
export function leadingChatBlock(markdown: string): { text: string, start: number, end: number } | undefined {
    const match = LEADING_FENCE.exec(markdown);
    if (!match || !isChatBlock(match[2], match[3])) return undefined;
    return {text: match[3], start: match[1].length, end: match[0].length};
}
