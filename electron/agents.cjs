// Spawns ACP agents (agents.json) and pipes their stdio to the renderer unchanged.
// The ACP client itself lives in the renderer (src/state/agent/); this side never parses JSON-RPC.

const {spawn} = require('node:child_process');
const path = require('node:path');
const {ipcMain} = require('electron');
const AGENTS = require('./agents.json');
const {getDashDirectory} = require('./duckdb.cjs');

let nextChannelId = 1;
const channels = new Map();

// A `package` entry runs the package's bin with Electron's own Node, so no node on PATH is needed.
function resolveCommand(agent) {
    if (!agent.package) return {command: agent.command, args: agent.args ?? [], env: {}};
    const pkgJsonPath = require.resolve(`${agent.package}/package.json`);
    const pkg = require(pkgJsonPath);
    const bin = typeof pkg.bin === 'string' ? pkg.bin : Object.values(pkg.bin)[0];
    return {
        command: process.execPath,
        args: [path.join(path.dirname(pkgJsonPath), bin), ...(agent.args ?? [])],
        env: {ELECTRON_RUN_AS_NODE: '1'},
    };
}

function startAgent(sender, agentId) {
    const agent = AGENTS.find((a) => a.id === agentId);
    if (!agent) throw new Error(`Unknown agent: ${agentId}`);

    const {command, args, env} = resolveCommand(agent);
    const cwd = getDashDirectory();
    const child = spawn(command, args, {
        cwd,
        env: {...process.env, ...env, ...agent.env},
        stdio: ['pipe', 'pipe', 'pipe'],
    });
    const channelId = nextChannelId++;
    channels.set(channelId, child);

    const send = (event, ...payload) => {
        if (!sender.isDestroyed()) sender.send(event, channelId, ...payload);
    };
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => send('agent:data', chunk));
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => console.log(`[agent:${agentId}] ${chunk.trimEnd()}`));
    child.on('exit', (code, signal) => {
        channels.delete(channelId);
        send('agent:exit', code ?? signal);
    });
    sender.once('destroyed', () => child.kill());

    return new Promise((resolve, reject) => {
        child.once('spawn', () => resolve({channelId, cwd}));
        child.once('error', (err) => {
            channels.delete(channelId);
            reject(new Error(`Could not start ${agent.label}: ${err.message}`));
        });
    });
}

function initAgents() {
    ipcMain.handle('agent:list', () => AGENTS.map(({id, label}) => ({id, label})));
    ipcMain.handle('agent:start', (event, agentId) => startAgent(event.sender, agentId));
    ipcMain.on('agent:write', (_event, channelId, chunk) => channels.get(channelId)?.stdin.write(chunk));
    ipcMain.on('agent:close', (_event, channelId) => channels.get(channelId)?.kill());
}

module.exports = {initAgents};
