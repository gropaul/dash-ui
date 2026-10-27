import Image from "next/image";
import Link from "next/link";
import {AppWindow, BookOpen, Github} from "lucide-react";
import {buttonVariants} from "@/components/ui/button";
import {cn} from "@/lib/utils";

/** The site's canonical address: www, which search engines index it under. */
export const SITE_URL = 'https://www.dash.builders';
export const APP_URL = 'https://app.dash.builders/';
export const GITHUB_URL = 'https://github.com/gropaul/dash';
export const RELEASES_URL = 'https://github.com/gropaul/dash-ui/releases/latest';

export function SiteHeader() {
    return (
        <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
                <Link href="/" className="flex items-center gap-2.5 font-semibold">
                    <Image src="/logo.png" alt="" width={28} height={28}/>
                    Dash
                </Link>
                <nav className="flex items-center gap-1 text-sm">
                    <Link href="/docs" className={cn(buttonVariants({variant: 'ghost', size: 'sm'}), "gap-2")}>
                        <BookOpen className="h-4 w-4"/>
                        <span className="hidden sm:inline">Docs</span>
                    </Link>
                    <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({variant: 'ghost', size: 'sm'}), "gap-2")}>
                        <Github className="h-4 w-4"/>
                        <span className="hidden sm:inline">GitHub</span>
                    </a>
                    <a href={APP_URL} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({variant: 'ghost', size: 'sm'}), "gap-2")}>
                        <AppWindow className="h-4 w-4"/>
                        <span className="hidden sm:inline">App</span>
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
                    <Image src="/logo.png" alt="" width={24} height={24}/>
                    <span className="font-semibold">Dash</span>
                    <span className="text-muted-foreground">SQL canvas and dashboards on DuckDB</span>
                </div>
                <nav className="flex items-center gap-5">
                    <Link href="/docs/canvas" className="hover:text-foreground">Canvas</Link>
                    <Link href="/duckdb-dashboard" className="hover:text-foreground">Dashboards</Link>
                    <Link href="/docs" className="hover:text-foreground">Docs</Link>
                    <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">GitHub</a>
                    <a href={APP_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">App</a>
                </nav>
            </div>
        </footer>
    );
}
