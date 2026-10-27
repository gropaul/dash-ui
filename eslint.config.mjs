import {defineConfig, globalIgnores} from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
    ...nextVitals,
    ...nextTs,
    globalIgnores([
        ".next*/**",
        "out/**",
        "src/web/.next*/**",
        "src/web/out/**",
        "src/web/next-env.d.ts",
        "dist/**",
        "dist-*/**",
        ".e2e-data/**",
        "test-results/**",
        "playwright-report/**",
        "next-env.d.ts",
    ]),
]);
