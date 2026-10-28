import { expect, test, type Locator, type Page } from '@playwright/test';
import { createInitialState } from '../../src/data/prototype';

async function inspectDialog(page: Page, entry: Locator) {
  const dialog = page.locator('dialog[open]');
  await expect(dialog).toHaveCount(1);
  await expect(dialog.getByRole('button', { name: '关闭', exact: true })).toBeFocused();
  const selector =
    'button:not(:disabled), input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, a[href], [tabindex="0"]';
  const count = await dialog.evaluate(
    (element, query) =>
      [...element.querySelectorAll<HTMLElement>(query)].filter(
        (control) => control.getClientRects().length > 0,
      ).length,
    selector,
  );
  const visited = new Set<number>();
  for (let step = 0; step < count * 2 + 6; step++) {
    await page.keyboard.press('Tab');
    const focus = await dialog.evaluate((element, query) => {
      const controls = [...element.querySelectorAll<HTMLElement>(query)].filter(
        (control) => control.getClientRects().length > 0,
      );
      const active = element.ownerDocument.activeElement;
      return {
        index: controls.indexOf(active as HTMLElement),
        body: active === element.ownerDocument.body,
        inside: element.contains(active),
      };
    }, selector);
    expect(focus.inside || focus.body).toBe(true);
    if (focus.index >= 0) visited.add(focus.index);
  }
  expect(visited.size).toBe(count);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(entry).toBeFocused();
}

test('全部记录类型及主要管理弹窗的 Tab 和 Esc 不进入背景、关闭后返回入口', async ({ page }) => {
  await page.goto('/#overview');
  await expect(page.getByLabel('记录空间', { exact: true })).toBeEnabled();
  const quick = page.getByRole('button', { name: '快速记录', exact: true });
  for (const label of [
    '身体状况',
    '习惯',
    '饮食',
    '学习 / 工作',
    '资产',
    '心情与精力',
    '日程与重要日期',
    '阶段目标',
  ]) {
    await test.step(`快速记录：${label}`, async () => {
      await quick.click();
      await page.getByRole('dialog').getByRole('button', { name: label, exact: true }).click();
      await inspectDialog(page, quick);
    });
  }
  const settings = page.getByRole('button', { name: '个人设置', exact: true });
  for (const label of ['备份与恢复', '打开回收站', '配置习惯', '查看随手记（0）']) {
    await test.step(`设置：${label}`, async () => {
      await settings.click();
      await page.getByRole('button', { name: label, exact: true }).click();
      await inspectDialog(page, settings);
    });
  }
  for (const label of ['查看全部', '查看全部日程', '设置目标', '查看数据来源']) {
    const entry = page.getByRole('button', { name: label, exact: true });
    await entry.click();
    await inspectDialog(page, entry);
  }
  for (const name of ['身体', '习惯', '饮食', '投入', '资产']) {
    await page.getByRole('button', { name, exact: true }).click();
    const entry = page.getByRole('button', { name: '查看与管理全部记录', exact: true });
    await entry.click();
    await inspectDialog(page, entry);
  }
  const snapshots = page.getByRole('button', { name: '查看账户快照', exact: true });
  await snapshots.click();
  await inspectDialog(page, snapshots);
  const raw = JSON.stringify(createInitialState());
  await page.evaluate((value) => localStorage.setItem('owner.workbench.prototype.v1', value), raw);
  await page.reload();
  await page.getByRole('button', { name: '旧记录迁移报告', exact: true }).click();
  await page.getByRole('button', { name: '复制到原型空间', exact: true }).click();
  await expect(
    page.getByLabel('记录空间', { exact: true }).locator('option:checked'),
  ).toContainText('原型记录');
  const copy = page.getByRole('button', { name: '选择旧记录到正式空间', exact: true });
  await copy.click();
  await inspectDialog(page, copy);
  expect(await page.evaluate(() => localStorage.getItem('owner.workbench.prototype.v1'))).toBe(raw);
});
