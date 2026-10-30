import Image from "next/image";
import Link from "next/link";
import {AppWindow, BookOpen, Github} from "lucide-react";
import {buttonVariants} from "@/components/ui/button";
import {cn} from "@/lib/utils";

/** The site's canonical address: www, which search engines index it under. */
export const SITE_URL = 'https://www.dash.builders';
export const APP_URL = 'https://app.dash.builders/';
export const GITHUB_URL = 'https://github.com/gropaul/dash';
export const SITE_DESCRIPTION = 'Dash is an open-source SQL workspace on DuckDB: queries on a canvas and dashboards written in '
    + 'Markdown, running locally in your browser or inside DuckDB.';
export const RELEASES_URL = 'https://github.com/gropaul/dash-ui/releases/latest';

export function SiteHeader() {
    return (
        <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
                <Link href="/" className="flex items-center gap-2.5 font-semibold">
                    {/* The duck sits in a circle and reaches out of it at the top. */}
                    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
                        <span className="absolute bottom-0 left-1/2 h-9 w-9 -translate-x-1/2 rounded-full bg-muted"/>
                        <Image src="/logo-64.webp" alt="" width={32} height={32} className="relative"/>
                    </span>
                    Dash
                </Link>
                <nav className="flex items-center gap-1 text-sm">
                    <Link href="/docs" className={cn(buttonVariants({variant: 'ghost', size: 'sm'}), "gap-2 rounded-2xl")}>
                        <BookOpen className="h-4 w-4"/>
                        <span className="sr-only sm:not-sr-only">Docs</span>
                    </Link>
                    <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({variant: 'ghost', size: 'sm'}), "gap-2 rounded-2xl")}>
                        <Github className="h-4 w-4"/>
                        <span className="sr-only sm:not-sr-only">GitHub</span>
                    </a>
                    <a href={APP_URL} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({variant: 'ghost', size: 'sm'}), "gap-2 rounded-2xl")}>
                        <AppWindow className="h-4 w-4"/>
                        <span className="sr-only sm:not-sr-only">Open in browser</span>
                    </a>
                </nav>
            </div>
        </header>
    );
}

export function SiteFooter() {
    return (
        <footer className="border-t">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row">
                <div className="flex items-center gap-2 text-foreground">
                    <Image src="/logo-64.webp" alt="" width={32} height={32}/>
                    <span className="font-semibold">Dash</span>
                </div>
                <nav className="flex items-center gap-5">
                    <Link href="/docs/canvas" className="hover:text-foreground">Canvas</Link>
                    <Link href="/dashboard-with-duckdb" className="hover:text-foreground">Dashboards</Link>
                    <Link href="/docs" className="hover:text-foreground">Docs</Link>
                    <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">GitHub</a>
                    <a href={APP_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Open in browser</a>
                </nav>
            </div>
        </footer>
    );
}
