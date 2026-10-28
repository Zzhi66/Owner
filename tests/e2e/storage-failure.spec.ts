import { expect, test } from '@playwright/test';

test('IndexedDB 写入失败时保留草稿，事务不留半条记录且可重试', async ({ page }) => {
  await page.goto('/#body');
  await expect(page.getByLabel('记录空间', { exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '添加当前板块记录', exact: true }).click();
  const input = page.getByLabel('睡眠时长（小时，按起床日期）', { exact: true });
  await input.fill('7.5');
  // Fault injection is confined to this disposable browser context and the next daily write.
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    let failNext = true;
    IDBObjectStore.prototype.put = function (
      this: IDBObjectStore,
      value: unknown,
      key?: IDBValidKey,
    ) {
      if (this.name === 'daily' && failNext) {
        failNext = false;
        throw new DOMException('QA storage quota failure', 'QuotaExceededError');
      }
      return key === undefined ? original.call(this, value) : original.call(this, value, key);
    };
  });
  await page.getByRole('button', { name: '保存记录', exact: true }).click();
  await expect(
    page.getByText('记录尚未保存。请查看页面提示，草稿已保留。', { exact: true }),
  ).toBeVisible();
  await expect(input).toHaveValue('7.5');
  const recordCount = await page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const request = indexedDB.open('owner.workbench.v2');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction('daily', 'readonly');
          const records = transaction.objectStore('daily').getAll();
          records.onerror = () => reject(records.error);
          records.onsuccess = () =>
            resolve(records.result.filter((row) => row.spaceId === 'personal').length);
          transaction.oncomplete = () => database.close();
        };
      }),
  );
  expect(recordCount).toBe(0);
  await page.getByRole('button', { name: '保存记录', exact: true }).click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(/有效记录 1\/7 天 · 均值 7.5 小时/)).toBeVisible();
});
