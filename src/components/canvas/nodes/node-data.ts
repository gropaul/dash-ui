/** The data of the text and link nodes, kept apart from their components so pages rendered on the server can use it. */

export type TextStyle = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'body' | 'code';

export interface TextStyleConfig {
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    fontFamily: string;
    lineHeight: number;
}

export const TEXT_STYLES: Record<TextStyle, TextStyleConfig> = {
    h1: {fontSize: 36, fontWeight: 'bold', fontFamily: 'inherit', lineHeight: 1.2},
    h2: {fontSize: 30, fontWeight: 'bold', fontFamily: 'inherit', lineHeight: 1.25},
    h3: {fontSize: 24, fontWeight: 'bold', fontFamily: 'inherit', lineHeight: 1.3},
    h4: {fontSize: 20, fontWeight: 'bold', fontFamily: 'inherit', lineHeight: 1.35},
    h5: {fontSize: 16, fontWeight: 'bold', fontFamily: 'inherit', lineHeight: 1.4},
    body: {fontSize: 16, fontWeight: 'normal', fontFamily: 'inherit', lineHeight: 1.5},
    code: {fontSize: 14, fontWeight: 'normal', fontFamily: 'monospace', lineHeight: 1.4},
};

export interface TextNodeData {
    text: string;
    textStyle: TextStyle;
    fontStyle: 'normal' | 'italic';
    textAlign: 'left' | 'center' | 'right';
    verticalAlign: 'top' | 'center' | 'bottom';
    /** The theme's text color when unset, so it follows dark mode. */
    color?: string;
    /** Behind the node's whole box; none when unset. */
    background?: string;
    /** How far the background's edges blur, in pixels; set in the file only. */
    backgroundBlur?: number;
}

export const DEFAULT_TEXT_NODE_DATA: TextNodeData = {
    text: '',
    textStyle: 'body',
    fontStyle: 'normal',
    textAlign: 'center',
    verticalAlign: 'center',
};

export interface LinkNodeData {
    label: string;
    href: string;
    variant: 'primary' | 'outline';
}

export const DEFAULT_LINK_NODE_DATA: LinkNodeData = {label: 'Link', href: 'https://', variant: 'primary'};
