import { expect, test } from '@playwright/test';

test('home page renders all seeded communities and the resident/admin/demo entry points', async ({
  page,
}) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Move-In / Move-Out — Agentic Workflow' })
  ).toBeVisible();
  await expect(page.getByText('Greenfield Heights')).toBeVisible();
  await expect(page.getByText('Riverside Villas')).toBeVisible();
  await expect(page.getByText('Willow Creek Co-Living')).toBeVisible();
  await expect(page.getByText('All move requests')).toBeVisible();

  await expect(page.getByRole('link', { name: 'Resident — Move-In' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Admin dashboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Demo scenarios' })).toBeVisible();
});
