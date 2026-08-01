// seed: test/seed.shared.spec.ts
// Runs on both runtimes (web + electron); see test/fixtures.ts.
import { test, expect } from './fixtures';
import {
  openApp,
  createProject,
  goToCatalog,
  goToProjectsList,
  openProject,
  setProjectSources,
  expectCatalogTable,
  waitForPersist,
} from './utils';

const ATTACH_SQL =
  "ATTACH 'https://raw.githubusercontent.com/gropaul/DuckDBCommunityExtensions/master/community_extensions.duckdb'\n" +
  "AS ce (READ_ONLY);";

// Two tables of the attached database; enough to tell "attached" from "not attached".
const CE_TABLES = ['downloads', 'github_snapshots'];

test.describe('Project data sources', () => {
  test('an attached database follows its project and does not leak into the next one', async ({ app: page, appOrigin }) => {
    test.setTimeout(240_000);

    await openApp(page, appOrigin);
    await createProject(page, 'E2E Sources');

    // Attaching writes sources.sql and replays it; the catalog picks the tables up on its own.
    await setProjectSources(page, ATTACH_SQL);
    await goToCatalog(page);
    for (const table of CE_TABLES) await expectCatalogTable(page, table, true);

    // Reopening replays the manifest, so the same database is back.
    await waitForPersist(page);
    await goToProjectsList(page);
    await openProject(page, 'E2E Sources');
    await goToCatalog(page);
    for (const table of CE_TABLES) await expectCatalogTable(page, table, true);

    // A different project must not inherit it: switching undoes the previous project's sources.
    await goToProjectsList(page);
    await createProject(page, 'E2E Sources Other');
    await goToCatalog(page);
    await expect(page.getByRole('table')).toBeVisible();
    for (const table of CE_TABLES) await expectCatalogTable(page, table, false);
  });
});
