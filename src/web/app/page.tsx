import Link from "next/link";
import {ArrowRight} from "lucide-react";
import {buttonVariants} from "@/components/ui/button";
import {CopyButton} from "@/components/basics/input/copy-button";
import {cn} from "@/lib/utils";
import {Hero} from "@web/components/hero";
import {PhoneHero} from "@web/components/phone-hero";
import {APP_URL, RELEASES_URL} from "@web/components/site-chrome";
import {DashboardDemo} from "@web/components/dashboard-demo";
import canvasText from "@web/components/landing.canvas?raw";

const EXTENSION_SETUP = `INSTALL dash FROM community;
LOAD dash;
PRAGMA dash;`;

const CAPABILITIES = [
    {tag: 'CANVAS', name: 'Canvas', body: 'SQL nodes, text, links and drawings on an infinite canvas, wired into a dataflow by the queries themselves.'},
    {tag: 'PAGES', name: 'Dashboards in Markdown', body: 'Pages of text and sql blocks: charts, tables, numbers and dropdowns, laid out in columns.'},
    {tag: 'FILES', name: 'Plain files', body: 'A project is a folder of .md, .sql and .canvas files. Diff them, review them, put them in git.'},
    {tag: 'LOCAL', name: 'Local engine', body: 'DuckDB runs every query in your browser or on your machine. No server, no upload, no cloud bill.'},
    {tag: 'AGENTS', name: 'Agents', body: 'In the desktop app, Claude Code, Codex, Gemini CLI, OpenCode or Goose work on your project through Dash.'},
    {tag: 'DUCKDB', name: 'Extension for DuckDB', body: 'Run Dash inside your own DuckDB, next to your local files and databases.'},
];

export default function Landing() {
    return (
        <>
            <Hero phone={<PhoneHero text={canvasText}/>}/>

            <section className="mx-auto max-w-6xl px-4 py-24">
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Get started</h2>
                <div className="mt-6 grid gap-10 md:grid-cols-3">
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold">In your browser</h3>
                        <p className="mt-2 leading-relaxed text-muted-foreground">
                            Nothing to install. DuckDB runs in the page, your files stay on your machine, and projects are
                            kept in the browser.
                        </p>
                        <a href={APP_URL} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants(), "mt-6 rounded-2xl")}>Open in browser</a>
                    </div>
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold">On your desktop</h3>
                        <p className="mt-2 leading-relaxed text-muted-foreground">
                            Runs DuckDB natively, opens any folder as a project and has the agent panel. For macOS,
                            Windows and Linux.
                        </p>
                        <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({variant: 'outline'}), "mt-6 rounded-2xl")}>Download</a>
                    </div>
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold">Inside DuckDB</h3>
                        <p className="mt-2 leading-relaxed text-muted-foreground">
                            Load the community extension and Dash runs inside your own DuckDB, next to your local files
                            and databases.
                        </p>
                        <div className="group relative mt-6">
                            <pre className="rounded-2xl border bg-muted-background p-4 font-mono text-xs leading-relaxed">{EXTENSION_SETUP}</pre>
                            <CopyButton textToCopy={EXTENSION_SETUP} className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100"/>
                        </div>
                    </div>
                </div>
            </section>

            <section className="border-y bg-muted-background">
                <div className="mx-auto max-w-6xl px-4 py-24">
                    <DashboardDemo/>
                    <Link href="/dashboard-with-duckdb" className={cn(buttonVariants({variant: 'outline'}), "mt-8 gap-2 rounded-2xl")}>
                        Dashboards with DuckDB <ArrowRight className="h-4 w-4"/>
                    </Link>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 py-24">
                <dl className="grid gap-x-14 md:grid-cols-2">
                    {CAPABILITIES.map(c => (
                        <div key={c.tag} className="flex gap-5 border-t py-5">
                            <span className="w-16 shrink-0 pt-1 font-mono text-xs text-muted-foreground">{c.tag}</span>
                            <div>
                                <dt className="font-semibold">{c.name}</dt>
                                <dd className="mt-1 leading-relaxed text-muted-foreground">{c.body}</dd>
                            </div>
                        </div>
                    ))}
                </dl>
            </section>
        </>
    );
}
