import {execSync} from 'child_process';
import fs from 'fs';

// Read the base version from package.json
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const baseVersion = packageJson.version;

// Determine commit hash and a build version based on commit count
const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
const buildVersion = execSync('git rev-list --count HEAD').toString().trim();

// `DASH_TARGET=site` builds the website (dash.builders) from the `*.site.tsx` routes instead of the app's.
const site = process.env.DASH_TARGET === 'site';

/** @type {import('next').NextConfig} */

const nextConfig = {
    transpilePackages: ['@duckdb/react-duckdb'],
    reactStrictMode: false,
    output: 'export',
    pageExtensions: site ? ['site.tsx', 'site.ts'] : ['tsx', 'ts', 'jsx', 'js'],

    // Next locks its dist dir per dev server, so a second `next dev` on the default
    // one exits. The Playwright e2e server sets NEXT_DIST_DIR (see playwright.config.ts)
    // to get its own, and can then run alongside a regular `pnpm dev`.
    // The site exports into its dist dir, `out-site`; `pnpm dev:site` sets its own.
    distDir: process.env.NEXT_DIST_DIR ?? (site ? 'out-site' : '.next'),

    // basePath: process.env.NEXT_PUBLIC_BASE_PATH,

    images: {
        unoptimized: true,
    },
    env: {
        NEXT_PUBLIC_BASE_VERSION: baseVersion,
        NEXT_PUBLIC_BUILD_VERSION: buildVersion,
        NEXT_PUBLIC_COMMIT_HASH: commitHash,
    },
    // Dev only (an export ignores them; vercel.json sets them). The site runs DuckDB without threads, and cross-origin
    // isolation would block its videos from blob storage.
    ...(!site && {async headers() {
        return [
            {
                source: "/(.*)", // apply to all routes
                headers: [
                    {
                        key: "Cross-Origin-Embedder-Policy",
                        value: "require-corp",
                    },
                    {
                        key: "Cross-Origin-Opener-Policy",
                        value: "same-origin",
                    },
                ],
            },
        ];
    }}),

    webpack(config, {isServer, dev}) {
        config.output.webassemblyModuleFilename = isServer && !dev ? '..static/wasm/[name].[moduleHash].wasm' : 'static/wasm/[name].[moduleHash].wasm'
        config.experiments = {...config.experiments, asyncWebAssembly: true}

        // `import text from './file.md?raw'` gives the file's text (Vitest does the same natively).
        config.module.rules.push({resourceQuery: /raw/, type: 'asset/source'})

        config.module.rules.push({
            test: /.*\.wasm$/,
            type: "asset/resource",
            generator: {
                filename: "static/wasm/[name].[contenthash][ext]",
            },
        })
        return config;
    }
}


export default nextConfig;