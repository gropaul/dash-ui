import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://app.dash.builders/');
  await page.locator('#radix-_r_a_').click();
  await page.getByRole('menuitem', { name: 'New Workflow (dev)' }).click();
  await page.locator('div').filter({ hasText: /^New Data Element$/ }).nth(2).click();
  await page.locator('div').filter({ hasText: /^New Data Element$/ }).nth(3).click();
  await page.locator('div').filter({ hasText: /^New Data Element$/ }).nth(3).click();
  await page.locator('div:nth-child(9) > div:nth-child(2) > .react-flow__resize-control.nodrag.bottom.right').click();
  await page.getByTestId('rf__node-n2').getByRole('button', { name: 'Run (1 Query)' }).click();
  await page.locator('div:nth-child(9) > div:nth-child(2) > .react-flow__resize-control.nodrag.bottom.right').click();
  await page.locator('div:nth-child(9) > div:nth-child(2) > .react-flow__resize-control.nodrag.bottom.right').click();
  await page.locator('div:nth-child(9) > div:nth-child(2) > .react-flow__resize-control.nodrag.bottom.right').click();
});