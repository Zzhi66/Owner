import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

async function openSettings(page: Page) {
  await page.getByRole('button', { name: '个人设置', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '控制台设置', exact: true })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/#overview');
  await expect(page.getByLabel('记录空间', { exact: true })).toBeEnabled();
  await expect(page.getByRole('heading', { name: '个人控制中心', exact: true })).toBeVisible();
});

test('系统减少动态效果能实际关闭过渡与 Agent 入场动画', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const launcher = page.getByRole('button', { name: '打开个人 Agent', exact: true });
  await expect(launcher).not.toHaveCSS('transition-duration', '0s');
  await launcher.click();
  const agent = page.locator('#agent-window');
  await expect(agent).toBeVisible();
  await expect(agent).toHaveCSS('animation-name', 'agent-enter');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches))
    .toBe(true);
  await expect(agent).toHaveCSS('animation-name', 'none');
  await expect(page.locator('#agent-launcher')).toHaveCSS('transition-duration', '0s');
  await expect(agent).toHaveCSS('scroll-behavior', 'auto');
});

test('输入法确认键不发送，Shift+Enter 换行，任务与产物在刷新后保留', async ({ page }) => {
  await page.getByRole('button', { name: '打开个人 Agent', exact: true }).click();
  const input = page.getByRole('textbox', { name: '向 Agent 描述任务', exact: true });
  await input.fill('QA-V1 中文输入法确认');
  await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true });
  await input.dispatchEvent('keydown', { key: 'Enter', keyCode: 229, isComposing: false });
  await expect(page.getByRole('tab', { name: '任务 0', exact: true })).toBeVisible();
  await expect(input).toHaveValue('QA-V1 中文输入法确认');
  await input.press('Shift+Enter');
  await expect(input).toHaveValue('QA-V1 中文输入法确认\n');
  await input.press('Enter');
  await page.getByRole('button', { name: '收起 Agent 工作窗', exact: true }).click();
  await expect(page.locator('#agent-window')).toBeHidden();
  await page.getByRole('button', { name: '打开个人 Agent', exact: true }).click();
  await page.getByRole('tab', { name: '任务 1', exact: true }).click();
  await expect(page.locator('#agent-panel-tasks')).toContainText('已完成');
  await page.getByRole('tab', { name: '任务 1', exact: true }).press('End');
  await expect(page.getByRole('tab', { name: '产物 1', exact: true })).toBeFocused();
  await page.getByRole('button', { name: '打开', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '个人近况复盘', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '打开', exact: true })).toBeFocused();
  await expect(page.locator('#agent-window')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#agent-launcher')).toBeFocused();
  await page.reload();
  await page.getByRole('button', { name: '打开个人 Agent', exact: true }).click();
  await expect(page.getByRole('tab', { name: '产物 1', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('身体零值、取消草稿与完整备份恢复可在独立空间往返', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: '身体', exact: true }).click();
  await page.getByRole('button', { name: '添加当前板块记录', exact: true }).click();
  await page.getByLabel('睡眠时长（小时，按起床日期）', { exact: true }).fill('7.5');
  await page.getByLabel('活动步数', { exact: true }).fill('0');
  await page.getByRole('button', { name: '保存记录', exact: true }).click();
  await page.getByRole('button', { name: '添加当前板块记录', exact: true }).click();
  await page.getByLabel('睡眠时长（小时，按起床日期）', { exact: true }).fill('9');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '添加当前板块记录', exact: true })).toBeFocused();
  await page.reload();
  await expect(page.getByText(/有效记录 1\/7 天 · 均值 7.5 小时/)).toBeVisible();
  await openSettings(page);
  await page.getByRole('button', { name: '备份与恢复', exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '导出完整备份（所有空间）', exact: true }).click(),
  ]);
  const backupPath = testInfo.outputPath('backup.json');
  await download.saveAs(backupPath);
  const backup = JSON.parse(await readFile(backupPath, 'utf8')) as { version: number };
  const file = page.locator('input[type="file"]');
  await file.setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{broken'),
  });
  await expect(page.getByText('不是有效的 JSON 备份文件', { exact: true })).toBeVisible();
  await file.setInputFiles({
    name: 'new.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ ...backup, version: 999 })),
  });
  await expect(page.getByText(/备份版本不受支持/)).toBeVisible();
  await file.setInputFiles(backupPath);
  await page
    .getByRole('combobox', { name: '选择来源空间', exact: true })
    .selectOption({ label: '正式记录 · 正式' });
  await page.getByRole('button', { name: '预览导入结果', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '将建立 1 个独立副本', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '确认建立恢复副本', exact: true }).click();
  await expect(page.getByLabel('记录空间', { exact: true }).locator('option:checked')).toHaveText(
    '恢复副本 · 正式记录 · 真实日期',
  );
  await page.getByRole('button', { name: '添加当前板块记录', exact: true }).click();
  await expect(page.getByLabel('睡眠时长（小时，按起床日期）', { exact: true })).toHaveValue('7.5');
  await expect(page.getByLabel('活动步数', { exact: true })).toHaveValue('0');
});

test('运行中刷新后，过期演示任务标为中断且不会生成成功产物', async ({ page }) => {
  await page.getByRole('button', { name: '打开个人 Agent', exact: true }).click();
  await page
    .getByRole('textbox', { name: '向 Agent 描述任务', exact: true })
    .fill('QA-V1 中断恢复');
  await page.getByRole('button', { name: '发送任务', exact: true }).click();
  await expect(page.getByText('正在整理当前空间记录…', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '打开个人 Agent', exact: true }).click();
  await page.getByRole('tab', { name: '任务 1', exact: true }).click();
  await expect(page.locator('#agent-panel-tasks')).toContainText('已中断', { timeout: 30_000 });
  await expect(page.getByRole('tab', { name: '产物 0', exact: true })).toBeVisible();
});

test('四种屏宽下图表实际渲染、排序持久化、示例长列表可逐页查看', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (['warning', 'error'].includes(message.type())) errors.push(message.text());
  });
  await page.getByLabel('记录空间', { exact: true }).selectOption('demo');
  const routes = [
    { name: '总览', hash: 'overview', charts: 0 },
    { name: '身体', hash: 'body', charts: 1 },
    { name: '习惯', hash: 'habits', charts: 1 },
    { name: '饮食', hash: 'diet', charts: 0 },
    { name: '投入', hash: 'work', charts: 1 },
    { name: '资产', hash: 'assets', charts: 2 },
  ];
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.getByRole('button', { name: route.name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`#${route.hash}$`));
      await expect(page.locator('.echart-host svg')).toHaveCount(route.charts);
      const bounds = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(bounds.scroll).toBeLessThanOrEqual(bounds.client);
      if (route.hash === 'overview' && [375, 1440].includes(width)) {
        await expect(page.locator('.toast')).toHaveCount(0);
        await page.screenshot({
          path: testInfo.outputPath(`overview-${width}.jpg`),
          fullPage: true,
        });
        if (width === 375) {
          await page.getByRole('button', { name: '打开个人 Agent', exact: true }).click();
          await expect(page.locator('#agent-window')).toBeVisible();
          await expect(page.locator('#agent-window')).toHaveCSS('opacity', '1');
          await page.screenshot({ path: testInfo.outputPath('agent-375.jpg') });
          await page.keyboard.press('Escape');
        }
      }
      if (route.hash === 'body' && width === 375) {
        await page.screenshot({ path: testInfo.outputPath('body-375.jpg'), fullPage: true });
      }
    }
  }
  await page.getByRole('button', { name: '饮食', exact: true }).click();
  await page.getByRole('button', { name: '查看与管理全部记录', exact: true }).click();
  await expect(page.getByRole('button', { name: /^编辑/ })).toHaveCount(40);
  await page.getByRole('button', { name: '显示更多', exact: true }).click();
  await expect(page.getByRole('button', { name: /^编辑/ })).toHaveCount(80);
  await page.getByRole('searchbox', { name: '搜索记录', exact: true }).fill('燕麦');
  await expect(page.getByRole('button', { name: /^编辑/ })).toHaveCount(28);
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await page.getByRole('button', { name: '总览', exact: true }).click();
  await page.setViewportSize({ width: 375, height: 900 });
  const handle = page.getByRole('button', {
    name: '拖动身体状况卡片，或按左右方向键调整顺序',
    exact: true,
  });
  await handle.click();
  await expect(
    page.getByRole('button', { name: '将身体状况卡片前移', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: '将身体状况卡片后移', exact: true }).click();
  await expect(page.getByText('卡片顺序已调整', { exact: true })).toBeVisible();
  await expect(page.locator('#dashboard-cards > article').first()).toHaveAttribute(
    'data-domain',
    'diet',
  );
  await page.reload();
  await expect(page.locator('#dashboard-cards > article').first()).toHaveAttribute(
    'data-domain',
    'diet',
  );
  await handle.press('ArrowLeft');
  await expect(page.locator('#dashboard-cards > article').first()).toHaveAttribute(
    'data-domain',
    'body',
  );
  expect(errors).toEqual([]);
});

test('快速随手记可用键盘保存、独立编辑并进入回收站', async ({ page }) => {
  const quick = page.getByRole('button', { name: '快速记录', exact: true });
  await quick.click();
  await page.getByRole('textbox', { name: '随手记', exact: true }).fill('QA-V1 随手记');
  await page.getByRole('textbox', { name: '随手记', exact: true }).press('Enter');
  await page.keyboard.press('Escape');
  await expect(quick).toBeFocused();
  await openSettings(page);
  await page.getByRole('button', { name: '查看随手记（1）', exact: true }).click();
  await expect(page.getByText('QA-V1 随手记', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  await page.getByRole('textbox', { name: '内容', exact: true }).fill('QA-V1 修改后的随手记');
  await page.getByRole('button', { name: '保存记录', exact: true }).click();
  await openSettings(page);
  await page.getByRole('button', { name: '查看随手记（1）', exact: true }).click();
  await expect(page.getByText('QA-V1 修改后的随手记', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  await page.getByRole('button', { name: '删除这条记录', exact: true }).click();
  await page.getByRole('button', { name: '确认删除（再点一次）', exact: true }).click();
  await openSettings(page);
  await page.getByRole('button', { name: '打开回收站', exact: true }).click();
  await expect(page.getByText('QA-V1 修改后的随手记', { exact: true })).toBeVisible();
});
