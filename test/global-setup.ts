import fs from 'node:fs';
import { E2E_DATA_DIR } from '../playwright.config';

/**
 * Wipe the throwaway Electron state (DuckDB files + Chromium profile) so every run
 * starts from a first-launch app: no leftover projects, no saved connection, no
 * onboarding flag. See the E2E_DATA_DIR comment in playwright.config.ts.
 *
 * The web target needs nothing here - each browser context gets a fresh OPFS.
 */
export default function globalSetup(): void {
  fs.rmSync(E2E_DATA_DIR, { recursive: true, force: true });
}
