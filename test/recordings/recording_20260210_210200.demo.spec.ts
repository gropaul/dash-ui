import { test } from "@playwright/test";
import { setupDemoCursor, demoVideoSettings } from "../utils/ghost-cursor-utils";

const BASE_URL = process.env.DEMO_URL || "http://localhost:3000";

test.use(demoVideoSettings);

test("demo", async ({ page }) => {
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(6000);

  const cursor = await setupDemoCursor(page);

  await cursor.click(page.getByRole("radio", { name: "Chart view" }));
  await page.waitForTimeout(300);

  await cursor.click(page.getByText("Select column...X-Axis"));
  await page.waitForTimeout(300);

  await cursor.click(page.getByRole("option", { name: "StationName" }));
  await page.waitForTimeout(300);

  await cursor.click(page.getByText("Select column...Y-Axis"));
  await page.waitForTimeout(300);

  await cursor.click(page.getByRole("option", { name: "num_services" }));
  await page.waitForTimeout(300);

  // Open chart options menu (now has stable test ID)
  await cursor.click(page.getByTestId("chart-options-menu"));
  await page.waitForTimeout(300);

  await cursor.click(page.getByTestId("menu-hide-settings"));
  await page.waitForTimeout(300);

  await cursor.click(page.getByRole("button", { name: "Hide Query" }));
  await page.waitForTimeout(300);

  await page.waitForTimeout(2000);
});
