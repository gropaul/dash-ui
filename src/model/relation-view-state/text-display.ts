import {RelationData} from "@/model/relation";

export type TextDisplayStyle = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'body' | 'code';

export interface TextDisplayStyleConfig {
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    fontFamily: string;
    lineHeight: number;
}

export const TEXT_DISPLAY_STYLES: Record<TextDisplayStyle, TextDisplayStyleConfig> = {
    h1: {fontSize: 36, fontWeight: 'bold', fontFamily: 'inherit', lineHeight: 1.2},
    h2: {fontSize: 30, fontWeight: 'bold', fontFamily: 'inherit', lineHeight: 1.25},
    h3: {fontSize: 24, fontWeight: 'bold', fontFamily: 'inherit', lineHeight: 1.3},
    h4: {fontSize: 20, fontWeight: 'bold', fontFamily: 'inherit', lineHeight: 1.35},
    h5: {fontSize: 16, fontWeight: 'bold', fontFamily: 'inherit', lineHeight: 1.4},
    body: {fontSize: 16, fontWeight: 'normal', fontFamily: 'inherit', lineHeight: 1.5},
    code: {fontSize: 14, fontWeight: 'normal', fontFamily: 'monospace', lineHeight: 1.4},
};

export interface TextDisplayViewState {
    textStyle: TextDisplayStyle;
    fontStyle: 'normal' | 'italic';
    textAlign: 'left' | 'center' | 'right';
    verticalAlign: 'top' | 'center' | 'bottom';
    color: string;
}

export function getInitialTextViewState(_data: RelationData): TextDisplayViewState {
    return getInitialTextViewStateEmpty();
}

export function getInitialTextViewStateEmpty(): TextDisplayViewState {
    return {
        textStyle: 'h3',
        fontStyle: 'normal',
        textAlign: 'center',
        verticalAlign: 'center',
        color: '#000000',
    };
}
