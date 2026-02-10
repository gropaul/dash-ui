#!/usr/bin/env npx tsx

/**
 * Translates a Playwright recording into a ghost-cursor demo.
 *
 * Usage: npx tsx scripts/translate-to-demo.ts <input-file> [output-file]
 */

import * as fs from "fs";
import * as path from "path";

const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile) {
  console.error("Usage: npx tsx scripts/translate-to-demo.ts <input-file> [output-file]");
  console.error("Example: npx tsx scripts/translate-to-demo.ts test/recordings/recording.ts");
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`File not found: ${inputFile}`);
  process.exit(1);
}

const inputContent = fs.readFileSync(inputFile, "utf-8");

// Generate output filename if not provided
const defaultOutput = inputFile.replace(/\.ts$/, ".demo.spec.ts");
const finalOutput = outputFile || defaultOutput;

// Transform the recording into a demo
function transformToDemo(content: string): string {
  let result = content;

  // Replace imports
  result = result.replace(
    /import \{ test, expect \} from '@playwright\/test';/,
    `import { test } from "@playwright/test";
import { setupDemoCursor, demoVideoSettings } from "../utils/ghost-cursor-utils";`
  );

  // Also handle double-quote imports
  result = result.replace(
    /import \{ test, expect \} from "@playwright\/test";/,
    `import { test } from "@playwright/test";
import { setupDemoCursor, demoVideoSettings } from "../utils/ghost-cursor-utils";`
  );

  // Add test.use for video settings after imports
  const lastImportMatch = result.match(/import .+ from .+;/g);
  if (lastImportMatch) {
    const lastImport = lastImportMatch[lastImportMatch.length - 1];
    const lastImportIndex = result.lastIndexOf(lastImport);
    const insertPoint = lastImportIndex + lastImport.length;
    result =
      result.slice(0, insertPoint) +
      `

const BASE_URL = process.env.DEMO_URL || "http://localhost:3000";

test.use(demoVideoSettings);
` +
      result.slice(insertPoint);
  }

  // Find the test function and add cursor setup
  result = result.replace(
    /test\(['"]([^'"]+)['"], async \(\{ page \}\) => \{\s*\n\s*await page\.goto\([^)]+\);/g,
    `test("$1", async ({ page }) => {
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  const cursor = await setupDemoCursor(page);`
  );

  // Transform click actions - page.getByRole(...).click()
  result = result.replace(
    /await page\.(getByRole|getByText|getByTestId|getByLabel|getByPlaceholder)\(([^)]+)\)\.click\(\);/g,
    `await cursor.click(page.$1($2));
  await page.waitForTimeout(300);`
  );

  // Transform click actions - page.locator(...).click()
  result = result.replace(
    /await page\.locator\(([^)]+)\)\.click\(\);/g,
    `await cursor.click($1);
  await page.waitForTimeout(300);`
  );

  // Transform click actions - page.click(...)
  result = result.replace(
    /await page\.click\(([^)]+)\);/g,
    `await cursor.click($1);
  await page.waitForTimeout(300);`
  );

  // Transform fill actions - move to element first, then fill
  result = result.replace(
    /await page\.(getByRole|getByText|getByTestId|getByLabel|getByPlaceholder)\(([^)]+)\)\.fill\(([^)]+)\);/g,
    `await cursor.click(page.$1($2));
  await page.$1($2).fill($3);
  await page.waitForTimeout(200);`
  );

  // Transform fill with page.fill
  result = result.replace(
    /await page\.fill\(([^,]+),\s*([^)]+)\);/g,
    `await cursor.click($1);
  await page.fill($1, $2);
  await page.waitForTimeout(200);`
  );

  // Add a final wait at the end of the test for recording
  result = result.replace(
    /\}\);(\s*)$/,
    `
  await page.waitForTimeout(2000);
});$1`
  );

  return result;
}

const demoContent = transformToDemo(inputContent);

// Ensure output directory exists
const outputDir = path.dirname(finalOutput);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(finalOutput, demoContent);

console.log(`Demo created: ${finalOutput}`);
console.log("");
console.log("To run the demo:");
console.log(`  pnpm test:e2e ${finalOutput} --headed`);
console.log("");
console.log("To run against production:");
console.log(`  DEMO_URL="https://app.dash.builders/" pnpm test:e2e ${finalOutput} --headed`);
