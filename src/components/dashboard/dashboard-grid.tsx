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
import {cn} from "@/lib/utils";
import {RelationWidget} from "@/components/dashboard/widgets/relation-widget";
import {TextWidget} from "@/components/dashboard/widgets/text-widget";

// RGL margin default is [10,10]. In edit mode we widen the horizontal container padding so the
// vertical widget toolbar (sitting at each widget's top-right) has room on both sides and the
// content stays centered.
const GRID_MARGIN = 8;

interface DashboardGridProps {
    dashboard: DashboardState;
    editMode: boolean;
    onOpenFullscreen: (widgetId: string) => void;
}

function compactorFor(compactType: CompactType): Compactor {
    if (compactType === 'horizontal') return horizontalCompactor;
    if (compactType === null) return noCompactor;
    return verticalCompactor; // 'vertical' (default) and 'wrap' fall back to vertical
}

export function DashboardGrid({dashboard, editMode, onOpenFullscreen}: DashboardGridProps) {
    const {width, containerRef} = useContainerWidth({initialWidth: 1200});
    const setDashboardLayouts = useRelationsState(s => s.setDashboardLayouts);
    const removeDashboardWidget = useRelationsState(s => s.removeDashboardWidget);
    const updateDashboardWidget = useRelationsState(s => s.updateDashboardWidget);

    const widgets = Object.values(dashboard.widgets ?? {});

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
        // Scroll area fills the tab; content is centered as a fixed max-width "page". The cap is
        // just above the lg breakpoint (1200px) so the 12-col desktop layout can still render.
        // Center with mx-auto (not flex) so the card grows with the grid instead of being stretched
        // to viewport height and clipped.
        <div className="w-full h-full overflow-auto bg-accent px-12">
            <div
                ref={containerRef}
                className={cn(
                    "mx-auto w-full max-w-7xl min-h-full",

                )}
            >
                {widgets.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        Empty dashboard — add a widget from the toolbar.
                    </div>
                ) : (
                <ResponsiveGridLayout
                    width={width}
                    breakpoints={DASHBOARD_BREAKPOINTS}
                    cols={DASHBOARD_COLS}
                    layouts={layouts}
                    rowHeight={dashboard.gridConfig.rowHeight}
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
                                    onExpand={() => onOpenFullscreen(widget.id)}
                                    onRemove={() => removeDashboardWidget(dashboard.id, widget.id)}
                                />
                            ) : (
                                <TextWidget
                                    value={widget.textData ?? ''}
                                    editable={editMode}
                                    onChange={(v) => updateDashboardWidget(dashboard.id, widget.id, {textData: v})}
                                    onRemove={() => removeDashboardWidget(dashboard.id, widget.id)}
                                />
                            )}
                        </div>
                    ))}
                </ResponsiveGridLayout>
                )}
            </div>
        </div>
    );
}
