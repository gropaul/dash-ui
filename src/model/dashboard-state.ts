import {getInitialTabViewBaseState, TabViewBaseState} from "@/model/relation-view-state";
import {getRandomId} from "@/platform/id-utils";
import {EntityBase} from "@/state/entities/entity-base";
// react-grid-layout v2.2.3 — modern rewrite (NOT the classic 1.x API)
import type {CompactType, Layout, ResponsiveLayouts} from "react-grid-layout";

export interface DashboardViewState extends TabViewBaseState {

}

export function getInitDashboardViewState(displayName: string): DashboardViewState {
    return {
        ...getInitialTabViewBaseState(displayName),
    };
}

/** A single cell on the dashboard grid. Relations are referenced by id (never embedded). */
export interface DashboardWidget {
    id: string;                    // distinct from relationId → same relation can appear twice
    type: 'relation' | 'text';
    relationId?: string;           // type === 'relation': reference into the relations map
    textData?: string;             // type === 'text': lightweight markdown/rich-text
}

export interface DashboardGridConfig {
    rowHeight: number;
    compactType: CompactType;
}

export interface DashboardState extends EntityBase {
    id: string;
    name: string;
    viewState: DashboardViewState;
    widgets: Record<string, DashboardWidget>;
    layouts: ResponsiveLayouts;    // { lg: Layout[], md: [], sm: [], xs: [] }
    gridConfig: DashboardGridConfig;
}

// Must be distinct and descending: RGL picks the highest breakpoint whose width is below the
// container's. `lg` (the authored, persisted 12-col layout) must win at desktop width; every
// smaller breakpoint renders the derived single-column layout. A tie (e.g. lg === md) makes the
// later key win, so the desktop layout would silently render — and persist — as the wrong (derived)
// breakpoint.
export const DASHBOARD_BREAKPOINTS = {lg: 996, md: 768, sm: 480, xs: 0} as const;
export const DASHBOARD_COLS = {lg: 12, md: 8, sm: 4, xs: 1} as const;

/**
 * Collapse a layout into a single full-width column, stacked in reading order:
 * top-to-bottom, then left-to-right (ties broken by x). Used for every breakpoint below `lg`, so
 * widgets stack in the same order the user reads them on desktop — RGL's auto-generated reflow
 * (correctBounds) does NOT preserve reading order.
 *
 * @param w full width for the target breakpoint (its column count), so each item spans one row.
 */
export function toSingleColumnLayout(layout: Layout, w: number = 1): Layout {
    let y = 0;
    return [...layout]
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .map(item => {
            const placed = {...item, x: 0, y, w};
            y += item.h;
            return placed;
        });
}

export const DEFAULT_DASHBOARD_GRID_CONFIG: DashboardGridConfig = {
    rowHeight: 60,
    compactType: 'vertical',
};

export function getEmptyDashboardLayouts(): ResponsiveLayouts {
    return {lg: [], md: [], sm: [], xs: []};
}

export function createRelationWidget(relationId: string): DashboardWidget {
    return {id: `widget-${getRandomId()}`, type: 'relation', relationId};
}

export function createTextWidget(textData: string = ''): DashboardWidget {
    return {id: `widget-${getRandomId()}`, type: 'text', textData};
}

/** Append a layout item for a new widget at the bottom of each breakpoint's column. */
export function appendWidgetToLayouts(
    layouts: ResponsiveLayouts,
    widgetId: string,
    w: number = 6,
    h: number = 6,
): ResponsiveLayouts {
    const next: ResponsiveLayouts = {...layouts};
    for (const [bp, cols] of Object.entries(DASHBOARD_COLS)) {
        const items = layouts[bp] ?? [];
        const maxY = items.reduce((m, it) => Math.max(m, it.y + it.h), 0);
        next[bp] = [...items, {i: widgetId, x: 0, y: maxY, w: Math.min(w, cols), h}];
    }
    return next;
}

export function getInitDashboardState(displayName: string = "New Dashboard", id?: string): DashboardState {
    return {
        id: id ?? `dashboard-${getRandomId()}`,
        name: displayName,
        viewState: getInitDashboardViewState(displayName),
        widgets: {},
        layouts: getEmptyDashboardLayouts(),
        gridConfig: {...DEFAULT_DASHBOARD_GRID_CONFIG},
    };
}
