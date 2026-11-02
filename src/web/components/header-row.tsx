'use client';

import Link from "next/link";
import {usePathname} from "next/navigation";
import {cn} from "@/lib/utils";
import {VIEWER_PAGES} from "@web/components/data-viewer/viewer-pages";
import {LearnHowLink} from "@web/components/data-viewer/scroll-links";

/**
 * The site header's row: the logo and "Dash" in the page's content width; on a viewer page, which fills the window
 * with its tool, across the window, with the page's title (its h1) in place of "Dash" and a link down to its text.
 */
export function HeaderRow({logo, nav}: { logo: React.ReactNode, nav: React.ReactNode }) {
    const viewer = VIEWER_PAGES[usePathname()];
    return (
        <div className={cn("flex h-14 items-center justify-between gap-4 px-4", !viewer && "mx-auto max-w-6xl")}>
            <div className="flex min-w-0 items-center gap-2.5">
                <Link href="/" aria-label={viewer ? "Dash" : undefined} className="flex items-center gap-2.5 font-semibold">
                    {logo}
                    {!viewer && 'Dash'}
                </Link>
                {viewer && (
                    <>
                        <h1 className="shrink-0 font-semibold">{viewer.title}</h1>
                        <LearnHowLink className="ml-2 hidden shrink-0 md:inline-flex"/>
                    </>
                )}
            </div>
            {nav}
        </div>
    );
}
