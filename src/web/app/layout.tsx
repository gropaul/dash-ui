import type {Metadata} from "next";
import {Analytics} from "@vercel/analytics/next";
import {Inter} from "next/font/google";
import {ThemeProvider} from "@/components/provider/theme-provider";
import "@/styles/globals.css";
import "@web/components/site.css";
import {APP_URL, GITHUB_URL, SITE_URL, SiteFooter, SiteHeader} from "@web/components/site-chrome";

// The app's Inter as a small woff2 subset, in place of its full TrueType file (site.css).
const inter = Inter({subsets: ['latin'], variable: '--font-inter'});

const DESCRIPTION = 'Dash is an open-source SQL workspace on DuckDB: queries on a canvas and dashboards written in '
    + 'Markdown, running locally in your browser or inside DuckDB.';

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {default: 'Dash - SQL Canvas and Dashboards with DuckDB', template: '%s - Dash'},
    description: DESCRIPTION,
    alternates: {canonical: '/'},
    openGraph: {type: 'website', siteName: 'Dash', images: ['/og.png']},
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
    // next-themes sets the theme class on <html> before it paints, hence the hydration warning off.
    return (
        <html lang="en" className={inter.variable} suppressHydrationWarning>
        <body className="min-h-dvh bg-background text-foreground antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(STRUCTURED_DATA)}}/>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <SiteHeader/>
            <main>{children}</main>
            <SiteFooter/>
        </ThemeProvider>
        <Analytics/>
        </body>
        </html>
    );
}
