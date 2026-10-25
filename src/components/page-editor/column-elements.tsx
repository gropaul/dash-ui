'use client';

import React, {createContext, useContext, useState} from "react";
import {PlateElement, PlateElementProps} from "platejs/react";
import {ResizeEvent, ResizeHandle} from "@platejs/resizable";
import {clamp} from "@/platform/number-utils";
import {cn} from "@/lib/utils";
import {GRID_COLUMNS, MIN_COLUMN_SPAN, preventTextSelection, spanOf, spanToWidth, TColumnElement} from "@/components/page-editor/model";

const COLUMN_GAP_PX = 24;

// Column spans keyed by column id, shown while a divider is dragged so the value is only written on release.
const ColumnPreviewContext = createContext<Record<string, number> | null>(null);

export function ColumnGroupElement(props: PlateElementProps) {
    const {element, editor} = props;
    const [preview, setPreview] = useState<Record<string, number> | null>(null);
    const [resizing, setResizing] = useState<number | null>(null);

    const columns = element.children as TColumnElement[];
    const spans = columns.map(c => preview?.[c.id as string] ?? spanOf(c));
    const gapsTotal = (columns.length - 1) * COLUMN_GAP_PX;

    // The handle is a direct child of the row, so `initialSize` is the row's width.
    const onResize = (index: number) => ({delta, finished, initialSize}: ResizeEvent) => {
        const start = columns.map(spanOf);
        const pair = start[index] + start[index + 1];
        const columnPx = (initialSize - gapsTotal) / GRID_COLUMNS;
        const left = clamp(start[index] + Math.round(delta / columnPx), MIN_COLUMN_SPAN, pair - MIN_COLUMN_SPAN);
        const next = start.map((s, i) => i === index ? left : i === index + 1 ? pair - left : s);
        if (!finished) return setPreview(Object.fromEntries(columns.map((c, i) => [c.id, next[i]])));

        setPreview(null);
        setResizing(null);
        const path = editor.api.findPath(element);
        if (!path) return;
        editor.tf.withoutNormalizing(() => {
            next.forEach((s, i) => editor.tf.setNodes<TColumnElement>({width: spanToWidth(s)}, {at: [...path, i]}));
        });
    };

    // Columns are flex-grown by their span, so a divider sits at its share of the width left after the gaps.
    const dividers = spans.slice(0, -1).map((_, i) => {
        const share = spans.slice(0, i + 1).reduce((sum, s) => sum + s, 0) / GRID_COLUMNS;
        const left = `calc(${share * 100}% - ${share * gapsTotal}px + ${(i + 0.5) * COLUMN_GAP_PX}px)`;
        return (
            <ResizeHandle key={i}
                          contentEditable={false}
                          options={{
                              direction: 'right',
                              onResize: onResize(i),
                              onMouseDown: (e) => {
                                  preventTextSelection(e);
                                  setResizing(i);
                              },
                          }}
                          style={{left}}
                          className={cn(
                              "absolute top-0 z-10 hidden h-full w-2 -translate-x-1/2 cursor-col-resize items-center justify-center select-none @3xl:flex",
                              "opacity-0 hover:opacity-100 transition-[left,opacity] duration-150 ease-out",
                              resizing === i && "opacity-100",
                          )}>
                <div className="pointer-events-none absolute inset-y-0 w-px bg-border"/>
                <div className="pointer-events-none relative h-8 w-1.5 rounded-full bg-border"/>
            </ResizeHandle>
        );
    });

    return (
        // No spacing of its own: the blocks in the columns bring theirs, so the row stays a whole number of grid rows.
        // Narrower than 768px the columns stack, in reading order.
        <PlateElement {...props} className="@container">
            <ColumnPreviewContext.Provider value={preview}>
                {/* Plate starts a selection rectangle from elements marked selectable, so the gaps work like the page margin. */}
                <div className="relative flex flex-col @3xl:flex-row" style={{gap: COLUMN_GAP_PX}} data-plate-selectable="true">
                    {props.children}
                    {dividers}
                </div>
            </ColumnPreviewContext.Provider>
        </PlateElement>
    );
}

export function ColumnElement(props: PlateElementProps<TColumnElement>) {
    const {element} = props;
    const preview = useContext(ColumnPreviewContext);
    const span = preview?.[element.id as string] ?? spanOf(element);

    return (
        // Side by side, a column grows by its span; stacked, it takes its content's height.
        <PlateElement {...props}
                      className="min-w-0 transition-[flex-grow] duration-150 ease-out @3xl:[flex:var(--span)_1_0%]"
                      style={{'--span': span} as React.CSSProperties}>
            {props.children}
        </PlateElement>
    );
}
