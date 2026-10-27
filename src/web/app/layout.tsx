import type {Metadata} from "next";
import {Analytics} from "@vercel/analytics/next";
import {Inter} from "next/font/google";
import "@/styles/globals.css";
import "@web/components/site.css";
import {APP_URL, GITHUB_URL, SITE_URL, SiteFooter, SiteHeader} from "@web/components/site-chrome";

// The app's Inter as a small woff2 subset, in place of its full TrueType file (site.css).
const inter = Inter({subsets: ['latin'], variable: '--font-inter'});

const DESCRIPTION = 'Dash is a SQL workspace on DuckDB: query nodes on a canvas and dashboards written in Markdown, '
    + 'running locally in your browser or inside DuckDB as an extension. Open source.';

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {default: 'Dash - SQL Canvas and Dashboards with DuckDB', template: '%s - Dash'},
    description: DESCRIPTION,
    alternates: {canonical: '/'},
    openGraph: {type: 'website', siteName: 'Dash', url: '/', images: ['/og.png']},
    twitter: {card: 'summary_large_image', images: ['/og.png']},
};

// Who makes Dash and what it is, for search engines.
const STRUCTURED_DATA = {
    '@context': 'https://schema.org',
    '@graph': [
        {'@type': 'Organization', '@id': `${SITE_URL}/#org`, name: 'Dash Builders', url: SITE_URL, logo: `${SITE_URL}/logo.png`, sameAs: [GITHUB_URL]},
        {'@type': 'WebSite', name: 'Dash', alternateName: 'Dash Builders', url: SITE_URL, publisher: {'@id': `${SITE_URL}/#org`}},
        {
            '@type': 'SoftwareApplication', name: 'Dash', url: APP_URL, applicationCategory: 'DeveloperApplication',
            operatingSystem: 'Web browser, macOS', description: DESCRIPTION, offers: {'@type': 'Offer', price: 0, priceCurrency: 'USD'},
            publisher: {'@id': `${SITE_URL}/#org`},
        },
    ],
};

export default function SiteLayout({children}: { children: React.ReactNode }) {
    return (
        <html lang="en" className={inter.variable}>
        <body className="min-h-dvh bg-background text-foreground antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(STRUCTURED_DATA)}}/>
        <SiteHeader/>
        <main>{children}</main>
        <SiteFooter/>
        <Analytics/>
        </body>
        </html>
    );
}
