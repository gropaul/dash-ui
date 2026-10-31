import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight} from "lucide-react";
import {buttonVariants} from "@/components/ui/button";
import {cn} from "@/lib/utils";
import {APP_URL} from "@web/components/site-chrome";

export const metadata: Metadata = {
    title: 'Dashboards with DuckDB in Your Browser',
    description: 'Dash builds dashboards from SQL queries in a Markdown file. The queries run on DuckDB in your browser, and Dash is open source.',
    alternates: {canonical: '/dashboard-with-duckdb'},
};

const STEPS = [
    {
        title: 'Add your data',
        body: 'Drop a CSV, Parquet, JSON or Excel file into Dash, or open a DuckDB file. You can also query a file by its URL.',
        code: `SELECT * FROM 'https://example.org/services.parquet'`,
    },
    {
        title: 'Write a block for each chart',
        body: 'The view line of a sql block sets how its result is shown. Pages have bar, line, area, scatter, pie and radar charts, tables and single numbers.',
        code: `\`\`\`sql busiest_stations
-- view: bar
-- x: StationName
-- y: stops
SELECT StationName, count(*) AS stops
FROM 'services.parquet'
GROUP BY ALL ORDER BY stops DESC LIMIT 10
\`\`\``,
    },
    {
        title: 'Filter with a dropdown',
        body: 'A block with the select view shows a dropdown. Other blocks read the picked values with refs.<name>() and run again when the pick changes.',
        code: `\`\`\`sql service_type
-- view: select
-- column: ServiceType
SELECT DISTINCT ServiceType FROM 'services.parquet'
\`\`\`

... WHERE ServiceType IN
      (SELECT ServiceType FROM refs.service_type())`,
    },
    {
        title: 'Arrange the blocks',
        body: 'Write text between the blocks to explain the numbers, and use columns to put charts side by side. The dashboard stays one Markdown file, so you can keep it in git.',
        code: `<columngroup>
<column span="7">
  ...chart...
</column>
<column span="5">
  Utrecht Centraal is the busiest station.
</column>
</columngroup>`,
    },
];

const FAQ = [
    {q: 'Does a dashboard in Dash need a server?', a: 'No. In the browser, DuckDB WASM runs the queries inside the page and your files never leave your machine. The desktop app and the DuckDB extension use native DuckDB instead.'},
    {q: 'Can I build a dashboard from a Parquet or CSV file?', a: 'Yes. Drop the file into Dash or query it by its path or URL. DuckDB reads CSV, Parquet, JSON and Excel files directly.'},
    {q: 'Can I use my own DuckDB database?', a: 'Open the .duckdb file in Dash, or run Dash inside your own DuckDB with the community extension: INSTALL dash FROM community; LOAD dash; PRAGMA dash;'},
    {q: 'Is Dash free?', a: 'Dash is open source under the AGPL-3.0 license and free to use.'},
];

export default function DuckDBDashboard() {
    return (
        <div className="mx-auto max-w-4xl px-4 py-20">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Dashboards with DuckDB, written in SQL and Markdown</h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                A Dash dashboard is a Markdown file with SQL blocks. Each block shows its result as a chart, a table or
                a dropdown that filters other blocks. The queries run on DuckDB in your browser, so your data stays on
                your machine.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
                <a href={APP_URL} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({size: 'lg'}), "rounded-2xl")}>Open in browser</a>
                <Link href="/docs/dashboards" className={cn(buttonVariants({variant: 'outline', size: 'lg'}), "gap-2 rounded-2xl")}>
                    Page format <ArrowRight className="h-4 w-4"/>
                </Link>
            </div>

            <ol className="mt-20 space-y-16">
                {STEPS.map((step, i) => (
                    <li key={step.title} className="grid gap-6 md:grid-cols-[1fr_1.3fr]">
                        <div>
                            <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{step.title}</h2>
                            <p className="mt-3 leading-relaxed text-muted-foreground">{step.body}</p>
                        </div>
                        <pre className="overflow-x-auto rounded-2xl border bg-muted-background p-5 font-mono text-[13px] leading-relaxed">{step.code}</pre>
                    </li>
                ))}
            </ol>

            <section className="mt-24">
                <h2 className="text-2xl font-semibold tracking-tight">Questions</h2>
                <dl className="mt-6 divide-y border-y">
                    {FAQ.map(({q, a}) => (
                        <div key={q} className="py-5">
                            <dt className="font-medium">{q}</dt>
                            <dd className="mt-2 leading-relaxed text-muted-foreground">{a}</dd>
                        </div>
                    ))}
                </dl>
            </section>
        </div>
    );
}
