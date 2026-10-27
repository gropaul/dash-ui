// Relays Dash's MCP server to agents. The server runs in the app window (src/state/agent/dash-mcp.ts), which
// holds the database connection and the files; this side listens on localhost with a random port and token and
// passes each JSON-RPC message through unparsed. Agents started by Dash get the address (see agent-chat.state.ts).

const http = require('node:http');
const crypto = require('node:crypto');
const {BrowserWindow, ipcMain} = require('electron');

const TOKEN = crypto.randomBytes(24).toString('hex');
// Long enough for a slow query; a window that reloads meanwhile never answers.
const ANSWER_TIMEOUT_MS = 5 * 60_000;

let nextMessageId = 1;
const pending = new Map();

ipcMain.on('mcp:answer', (_event, id, ok, value) => {
    const request = pending.get(id);
    if (!request) return;
    pending.delete(id);
    clearTimeout(request.timer);
    if (ok) request.resolve(value);
    else request.reject(new Error(value));
});

// The app's answer to `message`: the response to a request, or null for a notification.
function askApp(message) {
    const window = BrowserWindow.getAllWindows()[0];
    if (!window) return Promise.reject(new Error('Dash has no window open.'));
    const id = nextMessageId++;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            pending.delete(id);
            reject(new Error('Dash did not answer.'));
        }, ANSWER_TIMEOUT_MS);
        pending.set(id, {resolve, reject, timer});
        window.webContents.send('mcp:message', id, message);
    });
}

async function readBody(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf8');
}

const sendJson = (res, status, body) => res.writeHead(status, {'content-type': 'application/json'}).end(JSON.stringify(body));

// MCP's streamable HTTP transport without sessions or server-sent events: one JSON message in, its answer out.
async function handle(req, res) {
    if (req.url !== '/mcp') return void res.writeHead(404).end();
    if (req.headers.authorization !== `Bearer ${TOKEN}`) return void res.writeHead(401).end();
    if (req.method !== 'POST') return void res.writeHead(405, {allow: 'POST'}).end();
    let message;
    try {
        message = JSON.parse(await readBody(req));
    } catch {
        return sendJson(res, 400, {jsonrpc: '2.0', id: null, error: {code: -32700, message: 'Parse error'}});
    }
    try {
        const answer = await askApp(message);
        if (answer === null) return void res.writeHead(202).end();
        sendJson(res, 200, answer);
    } catch (e) {
        sendJson(res, 503, {jsonrpc: '2.0', id: message?.id ?? null, error: {code: -32603, message: e.message}});
    }
}

let address = null;

function initMcp() {
    const server = http.createServer((req, res) => void handle(req, res));
    server.listen(0, '127.0.0.1', () => {
        address = `http://127.0.0.1:${server.address().port}/mcp`;
        console.log(`[mcp] listening on ${address}`);
    });
    ipcMain.handle('mcp:server', () => address && {url: address, token: TOKEN});
}

module.exports = {initMcp};
