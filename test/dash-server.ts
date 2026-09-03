import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { E2E_DASH_EXTENSION, E2E_DASH_PORT, E2E_DUCKDB_BIN } from '../playwright.config';

/**
 * A DuckDB CLI with the `dash` extension serving its HTTP API - the backend behind
 * `PRAGMA dash`, which expands to `CALL start_dash('localhost', 4200, ...)`.
 *
 * Started per test with a throwaway HOME so the extension's data directory
 * ($HOME/.duckdb/extension_data/dash) starts empty, matching the other targets.
 */
export interface DashServer {
  url: string;
  stop: () => Promise<void>;
}

export function dashBinariesConfigured(): boolean {
  return !!E2E_DUCKDB_BIN && !!E2E_DASH_EXTENSION;
}

/**
 * A port nothing is listening on yet. Each test gets its own rather than reusing one:
 * a server that has been asked to stop can keep the socket for a moment, and the next
 * CLI would then fail to bind while the dying one still answers /api/ping - so the run
 * would silently talk to a server whose database is already gone.
 */
async function findFreePort(from: number): Promise<number> {
  for (let port = from; port < from + 200; port++) {
    const free = await new Promise<boolean>((resolve) => {
      const probe = net.createServer();
      probe.once('error', () => resolve(false));
      probe.once('listening', () => probe.close(() => resolve(true)));
      probe.listen(port, '127.0.0.1');
    });
    if (free) return port;
  }
  throw new Error(`no free port in [${from}, ${from + 200})`);
}

/**
 * Ready means the database answers, not merely that the socket does. The HTTP thread
 * outlives its DatabaseInstance, so /api/ping keeps returning "pong" from a server whose
 * queries all fail with "Database not available".
 */
async function waitForReady(url: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let last = 'no response';
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'SELECT 1', format: 'compact_json' }),
      });
      const body = await res.text();
      if (res.ok && body.includes('"rows"')) return;
      last = `${res.status}: ${body.slice(0, 200)}`;
    } catch (e) {
      last = (e as Error).message;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`dash server not ready within ${timeoutMs}ms (last: ${last})`);
}

export async function startDashServer(homeDir: string): Promise<DashServer> {
  fs.rmSync(homeDir, { recursive: true, force: true });
  fs.mkdirSync(homeDir, { recursive: true });
  const port = await findFreePort(E2E_DASH_PORT);

  // enable_cors so the page served from the dev server may call the API cross-origin;
  // open_browser off so the run stays headless.
  const initSql = path.join(homeDir, 'init.sql');
  fs.writeFileSync(
    initSql,
    // The response serializer uses to_json, and the test manifests read over https.
    // Release binaries autoload both on demand; a locally built CLI may not.
    `INSTALL json; LOAD json;\n` +
      `INSTALL httpfs; LOAD httpfs;\n` +
      `LOAD '${E2E_DASH_EXTENSION}';\n` +
      `CALL start_dash('localhost', ${port}, enable_cors=True, open_browser=False);\n`,
  );

  // stdio 'pipe' on stdin keeps the CLI in its read loop; on EOF it exits and takes the
  // server thread with it.
  const child: ChildProcess = spawn(E2E_DUCKDB_BIN!, ['-unsigned', '-init', initSql], {
    env: { ...process.env, HOME: homeDir },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const log: string[] = [];
  child.stdout?.on('data', (d) => log.push(String(d)));
  child.stderr?.on('data', (d) => log.push(String(d)));

  const url = `http://localhost:${port}`;
  try {
    await waitForReady(url);
  } catch (e) {
    child.kill('SIGKILL');
    throw new Error(`${(e as Error).message}\n--- duckdb output ---\n${log.join('')}`);
  }

  return {
    url,
    stop: async () => {
      child.stdin?.end();
      child.kill('SIGKILL');
      await new Promise((r) => child.on('exit', r));
    },
  };
}
