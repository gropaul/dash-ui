'use client';

// Grid + resize-handle styling lives in globals.css (themed). react-grid-layout v2 ships no CSS,
// and react-resizable's stylesheet isn't resolvable as a direct import under pnpm.
import {
    getBreakpointFromWidth,
    getColsFromBreakpoint,
    horizontalCompactor,
    noCompactor,
    ResponsiveGridLayout,
    useContainerWidth,
    verticalCompactor,
    type Compactor,
    type CompactType,
    type Layout,
    type ResponsiveLayouts,
} from "react-grid-layout";

import {DASHBOARD_BREAKPOINTS, DASHBOARD_COLS, DashboardState, toSingleColumnLayout} from "@/model/dashboard-state";
import {useRelationsState} from "@/state/relations.state";
import {ViewPadding} from "@/components/ui/view-padding";
import {RelationWidget} from "@/components/dashboard/widgets/relation-widget";
import {TextWidget} from "@/components/dashboard/widgets/text-widget";
import {DashboardToolbar} from "@/components/dashboard/dashboard-toolbar";

// Inter-widget spacing. Passed as RGL `margin`; `containerPadding` is [0,0] so the first row sits
// flush under the header (RGL's default containerPadding mirrors margin, which is what caused the
// top gap). Horizontal gutter around the grid is handled by the outer wrapper's px padding.
const GRID_MARGIN = 8;

interface DashboardGridProps {
    dashboard: DashboardState;
    editMode: boolean;
    onToggleEditMode: () => void;
    onOpenFullscreen: (widgetId: string) => void;
}

function compactorFor(compactType: CompactType): Compactor {
    if (compactType === 'horizontal') return horizontalCompactor;
    if (compactType === null) return noCompactor;
    return verticalCompactor; // 'vertical' (default) and 'wrap' fall back to vertical
}

export function DashboardGrid({dashboard, editMode, onToggleEditMode, onOpenFullscreen}: DashboardGridProps) {
    // `measureBeforeMount` holds `mounted` false until the effect measures the real container width.
    // Gating the grid render on it (below) means RGL's first paint uses the actual width instead of
    // `initialWidth` — without it the grid paints at 1200 then re-lays-out to the real width, and the
    // `.react-grid-item` transitions animate every widget sliding into place on page open.
    const {width, mounted, containerRef} = useContainerWidth({initialWidth: 1200, measureBeforeMount: true});
    const setDashboardLayouts = useRelationsState(s => s.setDashboardLayouts);
    const removeDashboardWidget = useRelationsState(s => s.removeDashboardWidget);
    const updateDashboardWidget = useRelationsState(s => s.updateDashboardWidget);

    const widgets = Object.values(dashboard.widgets ?? {});

    // Below `lg` the grid is a single column and there's no room for the right-gutter toolbar, so we
    // drop the horizontal padding (its only purpose is that gutter) and render the toolbar inside
    // each widget instead. Same width source RGL uses, so it flips exactly when the layout does.
    const compact = getBreakpointFromWidth(DASHBOARD_BREAKPOINTS, width) !== 'lg';

    // `lg` is the authored desktop layout and the single source of truth. Every smaller breakpoint
    // is derived from it as a full-width single column in reading order (top-to-bottom, then
    // left-to-right). RGL's own auto-generation (correctBounds) does NOT preserve that order, so we
    // never rely on persisted md/sm/xs layouts.
    const lg = dashboard.layouts.lg ?? [];
    const layouts: ResponsiveLayouts = {
        lg,
        md: toSingleColumnLayout(lg, DASHBOARD_COLS.md),
        sm: toSingleColumnLayout(lg, DASHBOARD_COLS.sm),
        xs: toSingleColumnLayout(lg, DASHBOARD_COLS.xs),
    };

    // Only the desktop (lg) layout is authored/persisted; the rest is derived each render.
    // Never fall back to `current` — at a small breakpoint that would overwrite lg with the
    // single-column layout.
    function onLayoutChange(_current: Layout, allLayouts: ResponsiveLayouts) {
        const nextLg = allLayouts.lg ?? lg;
        setDashboardLayouts(dashboard.id, {...dashboard.layouts, lg: nextLg});
    }

    return (
        // Scroll area fills the tab (bg spans full width); ViewPadding centers the content as a
        // max-width "page" with a responsive horizontal gutter. containerRef sits inside the gutter
        // so RGL's measured width matches the actual widget area.
        <div className="w-full h-full overflow-auto bg-accent pb-32">
            <ViewPadding active className="min-h-full">
                <div ref={containerRef} className="w-full">
                <DashboardToolbar
                    dashboard={dashboard}
                    editMode={editMode}
                    onToggleEditMode={onToggleEditMode}
                />
                {widgets.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        Empty dashboard — add a widget from the toolbar.
                    </div>
                ) : !mounted ? null : (
                <ResponsiveGridLayout
                    width={width}
                    breakpoints={DASHBOARD_BREAKPOINTS}
                    cols={DASHBOARD_COLS}
                    layouts={layouts}
                    rowHeight={dashboard.gridConfig.rowHeight}
                    margin={[GRID_MARGIN, GRID_MARGIN]}
                    containerPadding={[0, 0]}
                    compactor={compactorFor(dashboard.gridConfig.compactType)}
                    onLayoutChange={onLayoutChange}
                    dragConfig={{enabled: editMode, handle: '.widget-drag-handle'}}
                    resizeConfig={{enabled: editMode}}
                >
                    {widgets.map(widget => (
                        <div key={widget.id}>
                            {widget.type === 'relation' && widget.relationId ? (
                                <RelationWidget
                                    relationId={widget.relationId}
                                    editMode={editMode}
                                    compact={true}
                                    onExpand={() => onOpenFullscreen(widget.id)}
                                    onRemove={() => removeDashboardWidget(dashboard.id, widget.id)}
                                />
                            ) : (
                                <TextWidget
                                    value={widget.textData ?? ''}
                                    editable={editMode}
                                    compact={compact}
                                    onChange={(v) => updateDashboardWidget(dashboard.id, widget.id, {textData: v})}
                                    onRemove={() => removeDashboardWidget(dashboard.id, widget.id)}
                                />
                            )}
                        </div>
                    ))}
                </ResponsiveGridLayout>
                )}
                </div>
            </ViewPadding>
        </div>
    );
}
