import {memo} from "react";
import {RelationViewContentProps} from "@/components/relation/relation-view-content";
import {getInitialTextViewStateEmpty, TEXT_DISPLAY_STYLES} from "@/model/relation-view-state/text-display";

const verticalAlignToFlex = {
    top: 'flex-start',
    center: 'center',
    bottom: 'flex-end',
} as const;

export const TextDisplay = memo(function TextDisplay({data, relationState}: RelationViewContentProps) {
    const textDisplayState = relationState.viewState.textDisplayState ?? getInitialTextViewStateEmpty();
    const {textStyle, fontStyle, textAlign, verticalAlign, color} = textDisplayState;
    const styleConfig = TEXT_DISPLAY_STYLES[textStyle];

    // Get first row, first column (main text) and second column (description) if present
    const row = data.rows.length > 0 ? data.rows[0] : [];
    const value = row.length > 0 ? String(row[0] ?? '') : '';
    const description = row.length > 1 ? String(row[1] ?? '') : '';

    return (
        <div
            className="w-full h-full flex flex-col p-2"
            style={{
                justifyContent: verticalAlignToFlex[verticalAlign],
            }}
        >
            {description && (
                <div
                    className="whitespace-pre-wrap break-words overflow-hidden w-full text-muted-foreground"
                    style={{
                        fontSize: `${Math.round(styleConfig.fontSize * 0.45)}px`,
                        fontFamily: styleConfig.fontFamily,
                        textAlign,
                        lineHeight: styleConfig.lineHeight,
                    }}
                >
                    {description}
                </div>
            )}
            <div
                className="whitespace-pre-wrap break-words overflow-hidden w-full"
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
    );
});
