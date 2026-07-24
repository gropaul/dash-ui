import {memo} from "react";
import {RelationViewContentProps} from "@/components/relation/relation-view-content";
import {getInitialTextViewStateEmpty, TEXT_DISPLAY_STYLES} from "@/model/relation-view-state/text-display";
import {MarkdownRenderer} from "@/components/basics/code-fence/md-renderer";

// Vertical alignment via auto-margins rather than `justify-content`. On an overflowing flex column,
// `justify-content: center`/`flex-end` clips the top of the content and makes it unreachable by scroll;
// auto-margins collapse to 0 when there is no free space, so the full content stays scrollable.
const verticalAlignToMargin = {
    top: '0 0 auto 0',
    center: 'auto 0',
    bottom: 'auto 0 0 0',
} as const;

// Markdown renders a stack of block elements (paragraphs, headings, tables, code blocks). `text-align`
// alone only shifts inline text, leaving block children full-width — so we also map the alignment to
// `align-items` on the flex column to move the blocks themselves.
const horizontalAlignToItems = {
    left: 'flex-start',
    center: 'center',
    right: 'flex-end',
} as const;

export const TextDisplay = memo(function TextDisplay({data, relationState}: RelationViewContentProps) {
    const textDisplayState = relationState.viewState.textDisplayState ?? getInitialTextViewStateEmpty();
    const {textStyle, fontStyle, textAlign, verticalAlign, color} = textDisplayState;
    const styleConfig = TEXT_DISPLAY_STYLES[textStyle];

    // Get first row, first column (main text) and second column (description) if present
    const row = data.rows.length > 0 ? data.rows[0] : [];
    const value = row.length > 0 ? String(row[0] ?? '') : '';
    const description = row.length > 1 ? String(row[1] ?? '') : '';

    // Markdown style: render the value through the shared MarkdownRenderer (same as text widgets),
    // with the description shown as a small subtitle above it.
    if (textStyle === 'markdown') {
        return (
            <div className="w-full h-full flex flex-col p-2 overflow-auto">
                <div
                    className="w-full flex flex-col"
                    style={{margin: verticalAlignToMargin[verticalAlign]}}
                >
                    {description && (
                        <div
                            className="text-sm text-muted-foreground mb-1 break-words w-full"
                            style={{textAlign, lineHeight: styleConfig.lineHeight}}
                        >
                            {description}
                        </div>
                    )}
                    <div
                        className="dashboard-prose w-full text-sm flex flex-col"
                        style={{color, textAlign, alignItems: horizontalAlignToItems[textAlign]}}
                    >
                        {value
                            ? <MarkdownRenderer markdown={value}/>
                            : <span className="text-muted-foreground/50">No data</span>}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col p-2 overflow-auto">
            <div
                className="w-full flex flex-col"
                style={{margin: verticalAlignToMargin[verticalAlign]}}
            >
                {description && (
                    <div
                        className="whitespace-pre-wrap break-words w-full text-muted-foreground"
                        style={{
                            textAlign,
                            lineHeight: styleConfig.lineHeight,
                        }}
                    >
                        {description}
                    </div>
                )}
                <div
                    className="whitespace-pre-wrap break-words w-full text-primary"
                    style={{
                        fontSize: `${styleConfig.fontSize}px`,
                        fontWeight: styleConfig.fontWeight,
                        fontFamily: styleConfig.fontFamily,
                        fontStyle,
                        textAlign,
                        color,
                        lineHeight: styleConfig.lineHeight,
                    }}
                >
                    {value || <span className="text-muted-foreground/50">No data</span>}
                </div>
            </div>
        </div>
    );
});
