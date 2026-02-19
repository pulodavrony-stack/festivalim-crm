import { test, expect } from '@playwright/test';

test.describe('Авторизация', () => {
  test('показывает форму входа', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /вход/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/пароль/i)).toBeVisible();
  });

  test('показывает ошибку при неверных данных', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('wrong@example.com');
    await page.getByLabel(/пароль/i).fill('wrongpassword');
    await page.getByRole('button', { name: /войти/i }).click();
    await expect(page.getByText(/ошибка|неверн/i)).toBeVisible({ timeout: 5000 });
  });

  test('редиректит на /login если не авторизован', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/login/, { timeout: 5000 });
  });

  test('редиректит на /login при переходе на pipeline без авторизации', async ({ page }) => {
    await page.goto('/pipeline');
    await expect(page).toHaveURL(/login/, { timeout: 5000 });
  });
});
