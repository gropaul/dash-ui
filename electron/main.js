import {app, BrowserWindow, net, protocol, shell} from 'electron';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCHEME = 'app';
const APP_URL = `${SCHEME}://bundle/`;
// Set ELECTRON_START_URL=http://localhost:3000 to run against `pnpm dev`
const START_URL = process.env.ELECTRON_START_URL ?? APP_URL;

// Packaged: static export lives in Resources/app-bundle (see electron-builder.yml).
// Unpackaged: use the local `out/` directory from `pnpm build`.
const OUT_DIR = app.isPackaged
    ? path.join(process.resourcesPath, 'app-bundle')
    : path.join(__dirname, '..', 'out');

// Fallbacks in case net.fetch doesn't infer a content type
const MIME_TYPES = {
    '.wasm': 'application/wasm',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.css': 'text/css',
    '.html': 'text/html',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
};

protocol.registerSchemesAsPrivileged([
    {
        scheme: SCHEME,
        privileges: {standard: true, secure: true, supportsFetchAPI: true, stream: true, codeCache: true},
    },
]);

// Same rewrite rule as vercel.json: paths without a dot (and outside /_next/)
// are client routes and get index.html
function resolveOutFile(pathname) {
    if (pathname === '/' || !pathname.includes('.')) return 'index.html';
    return pathname.slice(1);
}

function registerAppProtocol() {
    protocol.handle(SCHEME, async (request) => {
        const pathname = decodeURIComponent(new URL(request.url).pathname);
        const filePath = path.normalize(path.join(OUT_DIR, resolveOutFile(pathname)));

        if (!filePath.startsWith(OUT_DIR + path.sep)) return new Response('Forbidden', {status: 403});
        if (!existsSync(filePath)) return new Response('Not Found', {status: 404});

        const response = await net.fetch(pathToFileURL(filePath).toString());

        // DuckDB WASM needs cross-origin isolation, same headers as vercel.json
        const headers = new Headers(response.headers);
        headers.set('Cross-Origin-Opener-Policy', 'same-origin');
        headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
        const mime = MIME_TYPES[path.extname(filePath)];
        if (!headers.has('content-type') && mime) headers.set('content-type', mime);

        return new Response(response.body, {status: response.status, headers});
    });
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1440,
        height: 900,
        title: 'Dash',
    });

    // External links go to the default browser instead of a new Electron window
    win.webContents.setWindowOpenHandler(({url}) => {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            shell.openExternal(url);
            return {action: 'deny'};
        }
        return {action: 'allow'};
    });

    win.loadURL(START_URL);
}

app.whenReady().then(() => {
    registerAppProtocol();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
