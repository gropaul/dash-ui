import { marked } from "marked";
import { v4 as uuidv4 } from "uuid";
import {
    DELIMITER_TOOL_NAME,
    HEADER_TOOL_NAME,
    LIST_TOOL_NAME,
    PARAGRAPH_BLOCK_NAME,
    WARNING_TOOL_NAME
} from "@/components/editor/tools";

export interface EditorJSBlock {
    /** Unique id for EditorJS */
    id: string;
    /** Name of the tool (aka block type) */
    type: string;
    /** Data payload accepted by the tool */
    data: any;
}

export function parseMarkdownToBlocks(markdown: string): EditorJSBlock[] {
    const tokens = marked.lexer(markdown);
    const blocks: EditorJSBlock[] = [];

    /**
     * Helper to push a paragraph in a single place so we do not repeat ourselves.
     */
    const appendParagraph = (text: string) => {
        if (!text.trim()) return; // skip empty lines
        blocks.push({
            id: uuidv4(),
            type: PARAGRAPH_BLOCK_NAME,
            data: { text }
        });
    };

    for (const token of tokens) {
        switch (token.type) {
            case "heading": {
                const { text, depth } = token as unknown as { text: string; depth: number };
                blocks.push({
                    id: uuidv4(),
                    type: HEADER_TOOL_NAME,
                    data: {
                        text,
                        level: depth
                    }
                });
                break;
            }
            case "paragraph": {
                appendParagraph((token as any).text);
                break;
            }
            case "list": {
                const listToken = token as unknown as {
                    ordered: boolean;
                    items: { text: string }[];
                };

                blocks.push({
                    id: uuidv4(),
                    type: LIST_TOOL_NAME,
                    data: {
                        style: listToken.ordered ? "ordered" : "unordered",
                        items: listToken.items.map((i) => i.text)
                    }
                });
                break;
            }
            case "hr": {
                blocks.push({
                    id: uuidv4(),
                    type: DELIMITER_TOOL_NAME,
                    data: {}
                });
                break;
            }
            case "blockquote": {
                // Treat blockquotes starting with an exclamation mark as warnings.
                const text = (token as any).text.trim();
                if (text.startsWith("!")) {
                    blocks.push({
                        id: uuidv4(),
                        type: WARNING_TOOL_NAME,
                        data: { text: text.replace(/^!\s*/, "") }
                    });
                } else {
                    appendParagraph(text);
                }
                break;
            }
            default: {
                // For unsupported tokens we either ignore or can fallback to paragraph.
                // appendParagraph((token as any).raw || "");
                break;
            }
        }
    }

    return blocks;
}

/*
Example
=======
const md = `# Trains in the Netherlands 🇳🇱\n\nThe Netherlands is home to a vast network of train stations, with some of the busiest and most popular hubs located in the heart of major cities such as **Utrecht**, **Amsterdam**, and **Rotterdam**, each serving as a vital link for both national and international travel.\n\n#### Number of Arrivals per Station`;

console.log(parseMarkdownToBlocks(md));
*/
