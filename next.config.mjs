/** @type {import('next').NextConfig} */

const nextConfig = {
    transpilePackages: ['@duckdb/react-duckdb'],
    reactStrictMode: false,
    output: 'export',

    basePath: process.env.NEXT_PUBLIC_BASE_PATH,

    images: {
        unoptimized: true,
    },

    webpack(config, { isServer, dev }) {
        config.output.webassemblyModuleFilename = isServer && !dev ? '..static/wasm/[name].[moduleHash].wasm' : 'static/wasm/[name].[moduleHash].wasm'
        config.experiments = { ...config.experiments, asyncWebAssembly: true }

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