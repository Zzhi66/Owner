import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test.describe('触屏输入', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 375, height: 812 } });

  test('可单指排序、展开 Agent 和操作记录弹窗', async ({ page }) => {
    await page.goto('/#overview');
    await expect(page.getByLabel('记录空间', { exact: true })).toBeEnabled();
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    const handle = page.getByRole('button', {
      name: '拖动身体状况卡片，或按左右方向键调整顺序',
      exact: true,
    });
    await handle.tap();
    const move = page.getByRole('button', { name: '将身体状况卡片后移', exact: true });
    const box = await move.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    await move.tap();
    await expect(page.getByText('卡片顺序已调整', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator('#dashboard-cards > article').first()).toHaveAttribute(
      'data-domain',
      'diet',
    );
    await page.getByRole('button', { name: '打开个人 Agent', exact: true }).tap();
    const agentBox = await page.locator('#agent-window').boundingBox();
    expect(agentBox).not.toBeNull();
    expect(agentBox!.x).toBeGreaterThanOrEqual(0);
    expect(agentBox!.x + agentBox!.width).toBeLessThanOrEqual(375);
    expect(agentBox!.y + agentBox!.height).toBeLessThanOrEqual(812);
    await page.getByRole('button', { name: '收起 Agent 工作窗', exact: true }).tap();
    await page.getByRole('button', { name: '身体', exact: true }).tap();
    await page.getByRole('button', { name: '添加当前板块记录', exact: true }).tap();
    await expect(page.getByLabel('睡眠时长（小时，按起床日期）', { exact: true })).toHaveCSS(
      'font-size',
      '16px',
    );
    const dialogBox = await page.locator('dialog[open]').boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(375);
    expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(812);
    await page.getByRole('button', { name: '关闭', exact: true }).tap();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
  });
});

test('损坏的旧 localStorage 保留原文、禁止迁移且能下载原始备份', async ({ page }, testInfo) => {
  const raw = 'QA-V1 invalid legacy {broken json';
  await page.goto('/#overview');
  await expect(page.getByLabel('记录空间', { exact: true })).toBeEnabled();
  await page.evaluate((value) => localStorage.setItem('owner.workbench.prototype.v1', value), raw);
  await page.reload();
  await page.getByRole('button', { name: '旧记录迁移报告', exact: true }).click();
  await expect(page.getByRole('button', { name: '复制到原型空间', exact: true })).toBeDisabled();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '下载原始备份', exact: true }).click(),
  ]);
  const path = testInfo.outputPath('invalid-legacy.txt');
  await download.saveAs(path);
  expect(await readFile(path, 'utf8')).toBe(raw);
  expect(await page.evaluate(() => localStorage.getItem('owner.workbench.prototype.v1'))).toBe(raw);
});
