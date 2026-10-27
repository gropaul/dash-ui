import {SITE_URL} from "@web/components/site-chrome";

export const dynamic = 'force-static';

export function GET() {
    return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`, {headers: {'Content-Type': 'text/plain'}});
}
