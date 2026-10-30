import {allDocs} from "@web/components/docs";
import {APP_URL, GITHUB_URL, RELEASES_URL, SITE_DESCRIPTION, SITE_URL} from "@web/components/site-chrome";

export const dynamic = 'force-static';

/** The site for language models, per llmstxt.org. */
export function GET() {
    const docs = allDocs().map(doc => `- [${doc.title}](${SITE_URL}/docs/${doc.slug}): ${doc.description}`).join('\n');
    const text = `# Dash

> ${SITE_DESCRIPTION}

A project is a folder of .md pages, .sql queries and .canvas files. Dash runs in the browser (DuckDB WASM), as a desktop
app (native DuckDB) or as the DuckDB community extension \`dash\` (\`INSTALL dash FROM community; LOAD dash; PRAGMA dash;\`).

## Docs

${docs}
- [Dashboards with DuckDB](${SITE_URL}/dashboard-with-duckdb): Charts, tables and dropdown filters in one Markdown file, running on DuckDB in your browser.

## Get Dash

- [Open in browser](${APP_URL}): The app, nothing to install.
- [Desktop app](${RELEASES_URL}): Releases for macOS, Windows and Linux.
- [Source](${GITHUB_URL}): Open source on GitHub.
`;
    return new Response(text, {headers: {'Content-Type': 'text/plain; charset=utf-8'}});
}
