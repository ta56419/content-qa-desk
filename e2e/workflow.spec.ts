import { test, expect } from '@playwright/test';

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`sample → correction → refresh → reopen at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const review = page.getByRole('region', { name: 'Check results' });
    await page.getByRole('button', { name: 'Run checks' }).click();
    await expect(review.locator('.result-number')).toHaveText('3');
    await expect(
      review.getByText('Image is missing an alt attribute'),
    ).toBeVisible();
    await page
      .getByLabel('Meta description', { exact: false })
      .fill('A practical Monday review for a small editorial team.');
    await expect(
      page.getByText('Draft changed. Run checks again to update this report.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Run checks' }).focus();
    await page.keyboard.press('Enter');
    await expect(review.locator('.result-number')).toHaveText('2');
    const savedId = await review.locator('.saved-tag').innerText();
    await page.reload();
    const history = page.getByRole('region', { name: 'Recent checks' });
    await history.getByRole('button').first().click();
    await expect(review.locator('.saved-tag')).toHaveText(savedId);
    await expect(review.locator('.result-number')).toHaveText('2');
    await expect(
      page.getByLabel('Meta description', { exact: false }),
    ).toHaveValue('A practical Monday review for a small editorial team.');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/workflow-${viewport.width}.png`,
      fullPage: true,
    });
  });
}

test('untrusted HTML remains text and API errors allow retry', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByLabel('Article HTML', { exact: false })
    .fill(
      '<h1>Safe</h1><img src="&lt;script&gt;alert(1)&lt;/script&gt;" onerror="alert(1)"><script>alert(1)</script>',
    );
  let dialogs = 0;
  page.on('dialog', async (dialog) => {
    dialogs++;
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Run checks' }).click();
  await expect(
    page.getByText('Image: <script>alert(1)</script>', { exact: true }),
  ).toBeVisible();
  expect(
    await page.locator('article img, .findings img, .findings script').count(),
  ).toBe(0);
  expect(dialogs).toBe(0);
  await page.route('**/api/reports', (route) => route.abort());
  await page.getByRole('button', { name: 'Run checks' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Could not reach the API',
  );
  await expect(page.getByRole('button', { name: 'Run checks' })).toBeEnabled();
  await page.unroute('**/api/reports');
  await page.getByRole('button', { name: 'Run checks' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
