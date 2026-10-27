import {allDocs} from "@web/components/docs";
import {SITE_URL} from "@web/components/site-chrome";

export const dynamic = 'force-static';

export function GET() {
    const paths = ['', '/duckdb-dashboard', '/docs', ...allDocs().map(doc => `/docs/${doc.slug}`)];
    const urls = paths.map(path => `  <url><loc>${SITE_URL}${path}</loc></url>`).join('\n');
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
        {headers: {'Content-Type': 'application/xml'}});
}
