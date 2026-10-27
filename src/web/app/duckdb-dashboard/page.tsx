import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight} from "lucide-react";
import {buttonVariants} from "@/components/ui/button";
import {cn} from "@/lib/utils";
import {APP_URL} from "@web/components/site-chrome";

export const metadata: Metadata = {
    title: 'DuckDB Dashboard in Your Browser',
    description: 'Build a DuckDB dashboard from SQL: charts, tables and dropdown filters in one Markdown file, running on DuckDB in your browser. No server, open source.',
    alternates: {canonical: '/duckdb-dashboard'},
};

const STEPS = [
    {
        title: 'Point it at your data',
        body: 'Drop a CSV, Parquet, JSON or Excel file into Dash, open a DuckDB file, or query a file by its URL. DuckDB reads it where it is.',
        code: `SELECT * FROM 'https://example.org/services.parquet'`,
    },
    {
        title: 'Write a block for each chart',
        body: 'A sql block with a view line shows its result: bar, line, area, scatter, pie or radar charts, a table, a headline number.',
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
        title: 'Add a dropdown to filter',
        body: 'A block shown as a dropdown passes on what is picked. Blocks reading it with refs.<name>() run again for every pick.',
        code: `\`\`\`sql service_type
-- view: select
-- column: ServiceType
SELECT DISTINCT ServiceType FROM 'services.parquet'
\`\`\`

... WHERE ServiceType IN
      (SELECT ServiceType FROM refs.service_type())`,
    },
    {
        title: 'Lay it out',
        body: 'Text between the blocks explains what the numbers mean; columns put charts side by side. The whole dashboard is one Markdown file you can keep in git.',
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
    {q: 'Does a DuckDB dashboard in Dash need a server?', a: 'No. In the browser, DuckDB WASM runs the queries in the page and your files stay on your machine. The desktop app and the DuckDB extension run DuckDB natively.'},
    {q: 'Can I build a dashboard from a Parquet or CSV file?', a: 'Yes. Drop the file into Dash, or query it by its path or URL; DuckDB reads CSV, Parquet, JSON and Excel files directly.'},
    {q: 'Can I use my own DuckDB database?', a: 'Yes: open a .duckdb file in Dash, or run Dash inside your DuckDB with the community extension (INSTALL dash FROM community; LOAD dash; PRAGMA dash;).'},
    {q: 'How is this different from a canvas?', a: 'A page reads top to bottom like a report; a canvas places the same kind of queries freely and draws how they feed each other. Both use the same sql blocks and refs.'},
    {q: 'Is Dash free?', a: 'Yes. Dash is open source under the AGPL-3.0 license.'},
];

const FAQ_DATA = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(({q, a}) => ({'@type': 'Question', name: q, acceptedAnswer: {'@type': 'Answer', text: a}})),
};

export default function DuckDBDashboard() {
    return (
        <div className="mx-auto max-w-4xl px-4 py-20">
            <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(FAQ_DATA)}}/>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">A DuckDB dashboard, written in SQL and Markdown</h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                Dash turns SQL into a dashboard that runs on DuckDB in your browser: charts, tables and dropdown
                filters in one Markdown file. No server, no upload, no build step.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
                <a href={APP_URL} target="_blank" rel="noopener noreferrer" className={buttonVariants({size: 'lg'})}>Open the app</a>
                <Link href="/docs/dashboards" className={cn(buttonVariants({variant: 'outline', size: 'lg'}), "gap-2")}>
                    The page format <ArrowRight className="h-4 w-4"/>
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
