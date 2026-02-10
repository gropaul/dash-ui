import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://app.dash.builders/');
  await page.getByRole('radio', { name: 'Chart view' }).click();
  await page.getByText('Select column...X-Axis').click();
  await page.getByRole('option', { name: 'StationName' }).click();
  await page.getByText('Select column...Y-Axis').click();
  await page.getByRole('option', { name: 'num_services' }).click();
  await page.locator('#radix-_r_1k_').click();
  await page.getByRole('menuitem', { name: 'Hide Settings' }).click();
  await page.getByRole('button', { name: 'Hide Query' }).click();
});