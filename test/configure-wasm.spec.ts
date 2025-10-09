import { test, expect } from '@playwright/test';

test('Test WASM Configuration', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.getByRole('button', { name: 'Connections' }).click();
    await page.getByRole('combobox').click();
    await page.getByText('DuckDB WASM', { exact: true }).click();
    await page.getByRole('button', { name: 'Connect', exact: true }).click();
    await page.waitForTimeout(3000);
    await page.getByRole('button', { name: 'Connect', exact: true }).click();
    await expect(page.getByRole('main')).toContainText('Run (1 Query)');
});