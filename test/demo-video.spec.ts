import { test } from "@playwright/test";
import { setupDemoCursor, demoVideoSettings } from "./utils/ghost-cursor-utils";

const BASE_URL = process.env.DEMO_URL || "http://localhost:3000";

test.use(demoVideoSettings);

test("demo with human-like mouse movements", async ({ page }) => {
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  const cursor = await setupDemoCursor(page);

  // Move around the page naturally
  await cursor.actions.move({ x: 400, y: 300 });
  await page.waitForTimeout(500);

  await cursor.actions.move({ x: 600, y: 400 });
  await page.waitForTimeout(300);

  // Click on a button (update selector as needed)
  // await cursor.actions.click({ target: 'button' });

  // Or interact with specific elements
  // await cursor.actions.click({ target: '[data-testid="my-element"]' });

  // Add more interactions here...
  await page.waitForTimeout(2000); // Keep recording a bit longer
});