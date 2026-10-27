import path from 'path';
import {fileURLToPath} from 'url';
import app from '../../next.config.mjs';

// The website (dash.builders): its own routes in app/, the app's code from the rest of src/. It leaves out the app's
// cross-origin isolation: the site runs DuckDB without threads, and isolation would block its videos.
const config = {
    ...app,
    headers: undefined,
    experimental: {externalDir: true},
    outputFileTracingRoot: path.join(path.dirname(fileURLToPath(import.meta.url)), '../..'),
};

export default config;
