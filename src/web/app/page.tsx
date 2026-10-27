import Link from "next/link";
import {ArrowRight, Github} from "lucide-react";
import {buttonVariants} from "@/components/ui/button";
import {cn} from "@/lib/utils";
import {DASH_VIDEO_BASE_URL} from "@/platform/global-data";
import {RelationData} from "@/model/relation";
import {Hero} from "@web/components/hero";
import {canvasBounds} from "@web/components/landing";
import {canvasNodes} from "@/state/workspace/canvas-text";
import {LandingMirror} from "@web/components/landing-mirror";
import {SiteVideo} from "@web/components/site-video";
import {APP_URL, GITHUB_URL, RELEASES_URL} from "@web/components/site-chrome";
import snapshot from "@web/components/landing-snapshot.json";
import canvasText from "@web/components/landing.canvas?raw";

const FEATURES = [
    {
        title: 'One query, any view',
        body: 'A node is a SQL editor with its result below it: a table, one of six charts, a headline number, a dropdown or a slider. Switching the view doesn\'t run the query again.',
        video: 'demo_canvas_different_views',
    },
    {
        title: 'Nodes read nodes',
        body: 'A node reads another with refs.<name>() in its SQL. Dash draws the arrow and runs everything downstream again, in order, when something upstream changes. Drag from one node to another and Dash writes the ref for you.',
        video: 'demo_canvas_dependent_table',
    },
    {
        title: 'Dropdowns filter what follows',
        body: 'A node shown as a dropdown passes on only the rows picked in it. Every node reading it follows the pick, so a canvas becomes an interactive dashboard with SQL alone.',
        video: 'demo_canvas_dependent_select',
    },
];

const PAGE_EXAMPLE = `# Train services

\`\`\`sql service_type
-- view: select
-- column: ServiceType
SELECT DISTINCT ServiceType FROM 'services.parquet'
\`\`\`

\`\`\`sql busiest_stations
-- view: bar
-- x: StationName
-- y: stops
SELECT StationName, count(*) AS stops
FROM 'services.parquet'
WHERE ServiceType IN
  (SELECT ServiceType FROM refs.service_type())
GROUP BY ALL ORDER BY stops DESC LIMIT 10
\`\`\``;

const CAPABILITIES = [
    {tag: 'CANVAS', name: 'Canvas', body: 'SQL nodes, text, links and drawings on an infinite canvas, wired into a dataflow by the queries themselves.'},
    {tag: 'PAGES', name: 'Dashboards in Markdown', body: 'Pages of text and sql blocks: charts, tables, numbers and dropdowns, laid out in columns.'},
    {tag: 'FILES', name: 'Plain files', body: 'A project is a folder of .md, .sql and .canvas files. Diff them, review them, put them in git.'},
    {tag: 'LOCAL', name: 'Local engine', body: 'DuckDB runs every query in your browser or on your machine. No server, no upload, no cloud bill.'},
    {tag: 'AGENTS', name: 'Agents', body: 'In the desktop app, Claude Code, Codex, Gemini CLI, OpenCode or Goose work on your project through Dash.'},
    {tag: 'DUCKDB', name: 'DuckDB extension', body: 'Run Dash inside your own DuckDB, next to your local files and databases.'},
];

export default function Landing() {
    const bounds = canvasBounds(canvasNodes(canvasText));
    const aspect = bounds.width / bounds.height;
    return (
        <>
            <Hero aspect={aspect} phone={<SiteVideo src={`${DASH_VIDEO_BASE_URL}/demo_canvas_big_example.mp4`} label="A canvas of nodes reading each other"/>}>
                <LandingMirror text={canvasText} data={snapshot.data as unknown as Record<string, RelationData>}/>
            </Hero>

            <section className="mx-auto max-w-6xl px-4 py-24">
                <h2 className="max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">A DuckDB canvas that keeps itself up to date</h2>
                <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                    Arrange queries instead of running them one by one. You see how the data flows, and every node
                    runs again when something it reads changes.
                </p>
                <div className="mt-16 space-y-24">
                    {FEATURES.map((feature, i) => (
                        <div key={feature.title} className="grid items-center gap-10 md:grid-cols-[2fr_3fr]">
                            <div className={cn(i % 2 === 1 && "md:order-last")}>
                                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                                <h3 className="mt-2 text-2xl font-semibold tracking-tight">{feature.title}</h3>
                                <p className="mt-3 leading-relaxed text-muted-foreground">{feature.body}</p>
                            </div>
                            <SiteVideo src={`${DASH_VIDEO_BASE_URL}/${feature.video}.mp4`} label={feature.title}/>
                        </div>
                    ))}
                </div>
                <Link href="/docs/canvas" className={cn(buttonVariants({variant: 'outline'}), "mt-16 gap-2")}>
                    How the canvas works <ArrowRight className="h-4 w-4"/>
                </Link>
            </section>

            <section className="border-y bg-muted-background">
                <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 md:grid-cols-2">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">DuckDB dashboards, written in Markdown</h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                            A dashboard is a page: one Markdown file with text and sql blocks that show their result as a
                            chart, a table, a number or a dropdown. Edit it block by block, or as the Markdown next to it.
                            It reads fine without Dash, and a coding agent writes it as easily as you do.
                        </p>
                        <Link href="/duckdb-dashboard" className={cn(buttonVariants(), "mt-8 gap-2")}>
                            DuckDB dashboards in Dash <ArrowRight className="h-4 w-4"/>
                        </Link>
                    </div>
                    <pre className="overflow-x-auto rounded-2xl border bg-background p-6 font-mono text-[13px] leading-relaxed shadow-[var(--node-shadow)]">{PAGE_EXAMPLE}</pre>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 py-24">
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Three ways to run it</h2>
                <div className="mt-10 grid gap-10 md:grid-cols-3">
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold">In your browser</h3>
                        <p className="mt-2 leading-relaxed text-muted-foreground">
                            Nothing to install. DuckDB runs in the page, your files stay on your machine, and projects are
                            kept in the browser.
                        </p>
                        <a href={APP_URL} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants(), "mt-6")}>Open the app</a>
                    </div>
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold">On your desktop</h3>
                        <p className="mt-2 leading-relaxed text-muted-foreground">
                            The desktop app runs DuckDB natively and opens any folder as a project, with the agent panel
                            next to it. For macOS, Windows and Linux.
                        </p>
                        <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({variant: 'outline'}), "mt-6")}>Download</a>
                    </div>
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold">Inside DuckDB</h3>
                        <p className="mt-2 leading-relaxed text-muted-foreground">
                            Load the community extension and Dash runs on your DuckDB, with your local files and databases.
                        </p>
                        <pre className="mt-6 rounded-xl border bg-muted-background p-4 font-mono text-sm leading-relaxed">{`INSTALL dash FROM community;
LOAD dash;
PRAGMA dash;`}</pre>
                        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({variant: 'outline'}), "mt-6 gap-2")}>
                            <Github className="h-4 w-4"/> The extension on GitHub
                        </a>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 pb-24">
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
