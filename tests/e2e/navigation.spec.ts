import { test, expect, Page } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

async function login(page: Page) {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    test.skip();
    return;
  }
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/пароль/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /войти/i }).click();
  await page.waitForURL(/^(?!.*login)/, { timeout: 10000 });
}

test.describe('Навигация (требует авторизации)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('главная страница загружается', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Фестивалим|Главная|CRM/i)).toBeVisible({ timeout: 10000 });
  });

  test('страница воронки загружается', async ({ page }) => {
    await page.goto('/pipeline');
    await expect(page.getByText(/воронка|pipeline/i)).toBeVisible({ timeout: 10000 });
  });

  test('страница клиентов загружается', async ({ page }) => {
    await page.goto('/clients');
    await expect(page.getByText(/контакты|клиенты/i)).toBeVisible({ timeout: 10000 });
  });

  test('страница аналитики загружается', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page.getByText(/аналитика/i)).toBeVisible({ timeout: 10000 });
  });

  test('страница задач загружается', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page.getByText(/задачи/i)).toBeVisible({ timeout: 10000 });
  });

  test('сайдбар содержит все пункты меню', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('aside');
    await expect(sidebar.getByText('Воронка')).toBeVisible();
    await expect(sidebar.getByText('Контакты')).toBeVisible();
    await expect(sidebar.getByText('Задачи')).toBeVisible();
    await expect(sidebar.getByText('Аналитика')).toBeVisible();
  });
});
