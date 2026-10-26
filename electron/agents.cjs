// Spawns ACP agents (agents.json) and pipes their stdio to the renderer unchanged.
// The ACP client itself lives in the renderer (src/state/agent/); this side never parses JSON-RPC.
// Dash ships no agent: it offers those whose CLI is installed. An entry runs its `command`, or a `package`
// (an ACP adapter shipped with Dash) driving the installed `executable` named by an env variable.

const {execFileSync, spawn} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {ipcMain} = require('electron');
const AGENTS = require('./agents.json');
const {getDashDirectory} = require('./duckdb.cjs');

let nextChannelId = 1;
const channels = new Map();

// An app started from the Dock or Finder gets a minimal PATH, so the user's login shell is asked for theirs,
// as editors do. The usual install places are added in case the shell doesn't answer.
let userPath = null;
function getUserPath() {
    if (userPath !== null) return userPath;
    let shellPath = '';
    if (process.platform !== 'win32') {
        try {
            const output = execFileSync(process.env.SHELL || '/bin/zsh', ['-ilc', 'printf "__PATH__%s__PATH__" "$PATH"'],
                {encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore']});
            shellPath = output.match(/__PATH__(.*)__PATH__/)?.[1] ?? '';
        } catch {
            // The defaults below still apply.
        }
    }
    const usual = [path.join(os.homedir(), '.local', 'bin'), '/opt/homebrew/bin', '/usr/local/bin'];
    userPath = [...new Set([shellPath, process.env.PATH ?? '', ...usual].join(path.delimiter).split(path.delimiter).filter(Boolean))]
        .join(path.delimiter);
    return userPath;
}

/** The path of `command` on the user's PATH, or null. */
function findExecutable(command) {
    const extensions = process.platform === 'win32' ? ['.exe', '.cmd', ''] : [''];
    for (const dir of getUserPath().split(path.delimiter)) {
        for (const ext of extensions) {
            const candidate = path.join(dir, command + ext);
            try {
                fs.accessSync(candidate, fs.constants.X_OK);
                return candidate;
            } catch {
                // not here
            }
        }
    }
    return null;
}

/** The agents of agents.json whose CLI is installed; under e2e only the script DASH_E2E_AGENT names. */
function availableAgents() {
    if (process.env.DASH_E2E_AGENT) return [{id: 'e2e', label: 'E2E agent', script: process.env.DASH_E2E_AGENT}];
    return AGENTS.filter((agent) => findExecutable(agent.executable?.command ?? agent.command));
}

/** Every agent of agents.json with the path its CLI was found at, null when it isn't installed. */
function listAgents() {
    if (process.env.DASH_E2E_AGENT) return [{id: 'e2e', label: 'E2E agent', command: 'node', path: process.env.DASH_E2E_AGENT}];
    return AGENTS.map(({id, label, executable, command}) => {
        const cli = executable?.command ?? command;
        return {id, label, command: cli, path: findExecutable(cli)};
    });
}

// A `package` entry runs the package's bin with Electron's own Node, so no node on PATH is needed.
function resolveCommand(agent) {
    if (agent.script) return {command: process.execPath, args: [agent.script], env: {ELECTRON_RUN_AS_NODE: '1'}};
    if (!agent.package) return {command: findExecutable(agent.command), args: agent.args ?? [], env: {}};
    const pkgJsonPath = require.resolve(`${agent.package}/package.json`);
    const pkg = require(pkgJsonPath);
    const bin = typeof pkg.bin === 'string' ? pkg.bin : Object.values(pkg.bin)[0];
    // In the packaged app the agent is unpacked next to the asar (electron-builder.yml): run it from there.
    const script = path.join(path.dirname(pkgJsonPath), bin).replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
    return {
        command: process.execPath,
        args: [script, ...(agent.args ?? [])],
        env: {ELECTRON_RUN_AS_NODE: '1', [agent.executable.env]: findExecutable(agent.executable.command)},
    };
}

function startAgent(sender, agentId) {
    const agent = availableAgents().find((a) => a.id === agentId);
    if (!agent) throw new Error(`Agent not installed: ${agentId}`);

    const {command, args, env} = resolveCommand(agent);
    const cwd = getDashDirectory();
    const child = spawn(command, args, {
        cwd,
        env: {...process.env, PATH: getUserPath(), ...env},
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

// Claude Code keeps each session as <config dir>/projects/<cwd, non-alphanumerics as ->/<id>.jsonl; ACP's session
// list doesn't carry its size, so it is read from there. Other agents give none.
function sessionSizes(agentId, sessions) {
    if (agentId !== 'claude') return {};
    const configDir = process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), '.claude');
    const sizes = {};
    for (const {sessionId, cwd} of sessions) {
        const file = path.join(configDir, 'projects', path.resolve(cwd).replace(/[^a-zA-Z0-9]/g, '-'), `${sessionId}.jsonl`);
        try {
            sizes[sessionId] = fs.statSync(file).size;
        } catch {
            // not stored where expected
        }
    }
    return sizes;
}

function initAgents() {
    ipcMain.handle('agent:session-sizes', (_event, agentId, sessions) => sessionSizes(agentId, sessions));
    ipcMain.handle('agent:list', () => listAgents());
    ipcMain.handle('agent:start', (event, agentId) => startAgent(event.sender, agentId));
    ipcMain.on('agent:write', (_event, channelId, chunk) => channels.get(channelId)?.stdin.write(chunk));
    ipcMain.on('agent:close', (_event, channelId) => channels.get(channelId)?.kill());
}

module.exports = {initAgents};
