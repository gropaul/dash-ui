// Takes the landing canvas's snapshot: what its queries show, so the site paints them before DuckDB has loaded
// (components/site-runtime.ts). Run it from the repository root after changing components/landing.canvas, against
// the website's dev server with the e2e hook:
//
//   NEXT_PUBLIC_E2E=1 pnpm dev:web
//   node src/web/snapshot.mjs [http://localhost:3200]
import fs from 'node:fs';
import {chromium} from 'playwright';

const SITE = process.argv[2] ?? 'http://localhost:3200';
const OUT = 'src/web/components/landing-snapshot.json';
const CANVAS = 'src/web/components/landing.canvas';
const TIMEOUT_MS = 120_000;

const queries = [...fs.readFileSync(CANVAS, 'utf8').matchAll(/^```sql (\w+)/gm)].length;
const browser = await chromium.launch();
try {
    const page = await browser.newPage({viewport: {width: 1600, height: 1000}});
    await page.goto(`${SITE}/?fresh`);
    await page.waitForFunction(count => {
        const take = window.__dashSiteSnapshot;
        if (!take) return false;
        const relations = Object.values(take().relations);
        return relations.length === count && relations.every(r => r.executionState.state === 'success');
    }, queries, {timeout: TIMEOUT_MS, polling: 500});
    const snapshot = await page.evaluate(() => window.__dashSiteSnapshot());
    fs.writeFileSync(OUT, JSON.stringify(snapshot) + '\n');
    console.log(`${OUT}: ${Object.keys(snapshot.relations).length} queries, ${Object.keys(snapshot.data).length} results`);
} finally {
    await browser.close();
}
