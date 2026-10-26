'use client';

import React from "react";
import {TElement} from "platejs";
import {PlateElement, PlateElementProps, RenderNodeWrapper} from "platejs/react";
import {isOrderedList} from "@platejs/list";
import {useTodoListElement, useTodoListElementState} from "@platejs/list/react";
import {Checkbox} from "@/components/ui/checkbox";
import {cn} from "@/lib/utils";

export function ParagraphElement(props: PlateElementProps) {
    // 28px line + 10px above and below: one grid row (GRID_ROW_PX).
    return <PlateElement {...props} className="py-2.5 leading-7">{props.children}</PlateElement>;
}

// Headings space themselves with margin, not padding: it falls outside the block, so the block's bar sits right above the text.
// h1 is one and a half grid rows, most of its space above it: 28 + 36 + 7 + a 1px underline. h2 to h4 are one row,
// with 4px below so they stay close to their text: 16 + 28 + 4, and for h4 20 + 24 + 4.
export function H1Element(props: PlateElementProps) {
    return <PlateElement as="h1" {...props} className="mt-7 pb-[7px] border-b text-3xl font-bold">{props.children}</PlateElement>;
}

export function H2Element(props: PlateElementProps) {
    return <PlateElement as="h2" {...props} className="mt-4 pb-1 text-xl font-semibold">{props.children}</PlateElement>;
}

export function H3Element(props: PlateElementProps) {
    return <PlateElement as="h3" {...props} className="mt-4 pb-1 text-lg font-semibold">{props.children}</PlateElement>;
}

export function H4Element(props: PlateElementProps) {
    return <PlateElement as="h4" {...props} className="mt-5 pb-1 text-base font-semibold">{props.children}</PlateElement>;
}

export function BlockquoteElement(props: PlateElementProps) {
    return (
        <PlateElement as="blockquote" {...props} className="my-1 border-l-2 pl-4 italic text-muted-foreground">
            {props.children}
        </PlateElement>
    );
}

export function CodeBlockElement(props: PlateElementProps) {
    return (
        <PlateElement {...props} className="my-1">
            <pre className="overflow-x-auto rounded-md bg-muted px-4 py-3 font-mono text-sm">
                <code>{props.children}</code>
            </pre>
        </PlateElement>
    );
}

export function CodeLineElement(props: PlateElementProps) {
    return <PlateElement {...props}>{props.children}</PlateElement>;
}

export function HrElement(props: PlateElementProps) {
    return (
        <PlateElement {...props} className="py-2">
            <hr contentEditable={false} className="border-t"/>
            {props.children}
        </PlateElement>
    );
}

interface TListElement extends TElement {
    listStyleType?: string;
    listStart?: number;
}

function TodoMarker({element}: { element: TElement }) {
    const {checkboxProps} = useTodoListElement(useTodoListElementState({element}));
    return (
        // Centred on the 28px line: (28 - 20) / 2.
        <div contentEditable={false} className="absolute -left-7 top-1 flex">
            <Checkbox {...checkboxProps} className="size-5 rounded-[5px] [&_svg]:size-3.5"/>
        </div>
    );
}

// Plate's lists are flat blocks carrying `listStyleType` and `indent`; this wraps each in its own ul/ol.
function ListItem(props: PlateElementProps<TListElement>) {
    const {element} = props;
    const todo = element.listStyleType === 'todo';
    const List = isOrderedList(element) ? 'ol' : 'ul';
    return (
        <List className="relative m-0 p-0" style={{listStyleType: todo ? 'none' : element.listStyleType}} start={element.listStart}>
            <li className={cn(todo && element.checked === true && "text-muted-foreground line-through")}>
                {todo && <TodoMarker element={element}/>}
                {props.children}
            </li>
        </List>
    );
}

export const BlockList: RenderNodeWrapper = ({element}) => {
    if (!(element as TListElement).listStyleType) return;
    return function ListBlock(props) {
        return <ListItem {...props}/>;
    };
};
