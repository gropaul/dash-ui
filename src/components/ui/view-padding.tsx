import {ReactNode} from "react";
import {cn} from "@/lib/utils";

interface ViewPaddingProps {
    children: ReactNode;
    className?: string;
    // When true, also apply the current horizontal gutter value as bottom padding (matches left/right).
    addPaddingBottom?: boolean;
    active?: boolean;
}

// Horizontal gutter, stepped across three container-query tiers: tight below `@view-medium`, more
// between medium and wide, most at/above `@view-wide`. Kept as literal class strings so Tailwind's
// JIT detects them (no interpolation).
const GUTTER_X = "px-2 @view-medium/view:px-8 @view-wide/view:px-8";
// Bottom padding mirroring the horizontal gutter tier for tier.
const GUTTER_BOTTOM = "pb-2 @view-medium/view:pb-8 @view-wide/view:pb-8";

// Centered "page" wrapper: horizontal gutter + max-width. The gutter is a container query
// (`@container/view`), so it responds to THIS view's own width — not the viewport. A view placed
// in a narrower region (e.g. beside a nav bar) keeps the tighter gutter until it actually gets wide.
// Pure CSS, no JS width measurement. className lands on the inner page (sizing/layout of the page).
//
// The `@view-medium` / `@view-wide` breakpoints are defined in tailwind.config.ts from the
// VIEW_PADDING_*_BREAKPOINT_PX constants.
export function ViewPadding({children, className, addPaddingBottom = false, active = false}: ViewPaddingProps) {
    if (!active) return <>{children}</>;
    return (
        <div className="@container/view w-full h-full">
            <div className={cn("mx-auto w-full max-w-6xl", GUTTER_X, addPaddingBottom && GUTTER_BOTTOM, className)}>
                {children}
            </div>
        </div>
    );
}
