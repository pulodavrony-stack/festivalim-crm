import { test, expect } from '@playwright/test';

test.describe('Колокольчик уведомлений', () => {
  test('кнопка колокольчика видна в sidebar после входа', async ({ page }) => {
    const email = process.env.TEST_EMAIL;
    const pass = process.env.TEST_PASSWORD;
    if (!email || !pass) test.skip();

    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/пароль/i).fill(pass!);
    await page.getByRole('button', { name: /войти/i }).click();
    await page.waitForURL(/^(?!.*login)/, { timeout: 10000 });

    // Колокольчик должен быть в sidebar
    const bell = page.getByRole('button', { name: /уведомления/i });
    await expect(bell).toBeVisible({ timeout: 5000 });
  });

  test('клик на колокольчик открывает панель уведомлений', async ({ page }) => {
    const email = process.env.TEST_EMAIL;
    const pass = process.env.TEST_PASSWORD;
    if (!email || !pass) test.skip();

    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/пароль/i).fill(pass!);
    await page.getByRole('button', { name: /войти/i }).click();
    await page.waitForURL(/^(?!.*login)/, { timeout: 10000 });

    await page.getByRole('button', { name: /уведомления/i }).click();
    await expect(page.getByText(/уведомления/i)).toBeVisible({ timeout: 3000 });
  });
});
