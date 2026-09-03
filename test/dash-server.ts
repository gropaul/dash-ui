import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
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

async function waitForPing(url: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/api/ping`);
      if (res.ok && (await res.text()).trim() === 'pong') return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`dash server did not answer /api/ping within ${timeoutMs}ms`);
}

export async function startDashServer(homeDir: string): Promise<DashServer> {
  fs.rmSync(homeDir, { recursive: true, force: true });
  fs.mkdirSync(homeDir, { recursive: true });

  // enable_cors so the page served from the dev server may call the API cross-origin;
  // open_browser off so the run stays headless.
  const initSql = path.join(homeDir, 'init.sql');
  fs.writeFileSync(
    initSql,
    // The response serializer uses to_json. Release builds autoload json on demand; a locally
    // built CLI may not, so ask for it explicitly.
    `INSTALL json; LOAD json;\n` +
      `LOAD '${E2E_DASH_EXTENSION}';\n` +
      `CALL start_dash('localhost', ${E2E_DASH_PORT}, enable_cors=True, open_browser=False);\n`,
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

  const url = `http://localhost:${E2E_DASH_PORT}`;
  try {
    await waitForPing(url);
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
