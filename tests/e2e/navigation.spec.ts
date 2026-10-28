import { expect, test, type Page } from '@playwright/test';

async function open(page: Page, demo = false) {
  await page.goto('/#overview');
  await expect(page.getByLabel('记录空间', { exact: true })).toBeEnabled();
  await expect(page.getByRole('heading', { name: '个人控制中心', exact: true })).toBeVisible();
  if (demo) {
    await page.getByLabel('记录空间', { exact: true }).selectOption('demo');
    await expect(page.locator('.prototype-badge')).toContainText('示例体验');
  }
}

async function go(page: Page, name: string, view: string) {
  await page.getByRole('button', { name, exact: true }).click();
  await expect(page.locator('.route-content')).toHaveAttribute('data-view', view);
  await expect(page.locator('#page-main')).toHaveAttribute('aria-busy', 'false');
}

test('四种屏宽下导航光条跟随选中模块，固定外壳与 Agent 草稿保留', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await open(page, true);
  await page.getByRole('button', { name: '打开个人 Agent', exact: true }).click();
  const input = page.getByRole('textbox', { name: '向 Agent 描述任务', exact: true });
  await input.fill('QA-导航时保留草稿');
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [name, view] of [
      ['身体', 'body'],
      ['习惯', 'habits'],
      ['资产', 'assets'],
      ['总览', 'overview'],
    ]) {
      await go(page, name!, view!);
      await expect
        .poll(async () =>
          page.locator('.navigation nav').evaluate((nav) => {
            const marker = nav.querySelector('.nav-indicator')!.getBoundingClientRect();
            const selected = nav.querySelector('[aria-current="page"]')!.getBoundingClientRect();
            return Math.max(
              Math.abs(marker.x - selected.x),
              Math.abs(marker.y - selected.y),
              Math.abs(marker.width - selected.width),
              Math.abs(marker.height - selected.height),
            );
          }),
        )
        .toBeLessThan(1);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
      await expect(input).toHaveValue('QA-导航时保留草稿');
    }
  }
  await go(page, '身体', 'body');
  await expect(page.locator('.context-strip')).toContainText('身体状况');
  await page.getByRole('button', { name: '切换到个人总览上下文', exact: true }).click();
  await expect(page.locator('.context-strip')).toContainText('个人总览');
  await go(page, '习惯', 'habits');
  await expect(page.locator('.context-strip')).toContainText('习惯');
  await expect(input).toHaveValue('QA-导航时保留草稿');
  await page.getByRole('button', { name: '收起 Agent 工作窗', exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
  await page.screenshot({ path: testInfo.outputPath('navigation-desktop.jpg'), fullPage: true });
  expect(errors).toEqual([]);
});

test('各模块记住滚动位置，前进后退和未知 hash 恢复正确且新模块从顶部开始', async ({ page }) => {
  await open(page, true);
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(600);
  await go(page, '身体', 'body');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.evaluate(() => window.scrollTo(0, 250));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(250);
  await go(page, '资产', 'assets');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.goBack();
  await expect(page.locator('.route-content')).toHaveAttribute('data-view', 'body');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(250);
  await page.goBack();
  await expect(page.locator('.route-content')).toHaveAttribute('data-view', 'overview');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(600);
  await page.goForward();
  await expect(page.locator('.route-content')).toHaveAttribute('data-view', 'body');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(250);
  await go(page, '身体', 'body');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(250);
  await page.evaluate(() => {
    window.location.hash = 'unknown-module';
  });
  await expect(page).toHaveURL(/#overview$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(600);
  await page.getByLabel('记录空间', { exact: true }).selectOption('personal');
  await expect(page.locator('.prototype-badge')).toContainText('正式记录');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.getByLabel('记录空间', { exact: true }).selectOption('demo');
  await expect(page.locator('.prototype-badge')).toContainText('示例体验');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(600);
});

test('首次加载未完成时连续切换以最后选择为准，导航不写入记录空间', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/assets\/DomainDetails-[^/]+\.js$/, async (route) => {
    await gate;
    await route.continue();
  });
  await open(page);
  const revision = () =>
    page.evaluate(
      () =>
        new Promise<number>((resolve, reject) => {
          const request = indexedDB.open('owner.workbench.v2');
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const database = request.result;
            const transaction = database.transaction('spaces', 'readonly');
            const record = transaction.objectStore('spaces').get('personal');
            record.onsuccess = () => resolve(record.result.revision as number);
            record.onerror = () => reject(record.error);
            transaction.oncomplete = () => database.close();
          };
        }),
    );
  const before = await revision();
  try {
    await page.getByRole('button', { name: '身体', exact: true }).click();
    await expect(page.locator('#page-main')).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByText('正在打开身体状况…', { exact: true })).toHaveCSS('opacity', '1');
    await expect(page.locator('.route-content')).toHaveAttribute('data-view', 'overview');
    await page.getByRole('button', { name: '习惯', exact: true }).click();
    await page.getByRole('button', { name: '总览', exact: true }).click();
  } finally {
    release();
  }
  await expect(page.locator('#page-main')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.route-content')).toHaveAttribute('data-view', 'overview');
  for (const [name, view] of [
    ['身体', 'body'],
    ['习惯', 'habits'],
    ['饮食', 'diet'],
    ['投入', 'work'],
    ['资产', 'assets'],
  ]) {
    await go(page, name!, view!);
  }
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('资产');
  await expect(page.locator('.toast')).toHaveCount(0);
  expect(await revision()).toBe(before);
});

test('原生过渡不可用时仍可导航，减少动态效果会立即取消过渡', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, 'startViewTransition', { value: undefined });
  });
  await open(page);
  await go(page, '身体', 'body');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('身体状况');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await go(page, '习惯', 'habits');
  await expect(page.locator('.nav-indicator')).toHaveCSS('transition-duration', '0s');
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await page.reload();
  await expect(page.locator('.route-content')).toHaveAttribute('data-view', 'habits');
  await expect(page.getByRole('heading', { name: '小习惯，慢慢积累', exact: true })).toBeVisible();
});

test('原生内容过渡实际运行，运行中开启减少动态效果会取消动画', async ({ page }) => {
  await open(page);
  await go(page, '身体', 'body');
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          document
            .getAnimations()
            .some(
              (animation) =>
                animation instanceof CSSAnimation && animation.animationName === 'route-arrive',
            ),
        ),
      { intervals: [10, 20, 30], timeout: 1500 },
    )
    .toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
  await expect(page.locator('.route-content')).toHaveCSS('opacity', '1');
  await go(page, '习惯', 'habits');
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
});

test('详情模块加载失败保留当前页面，恢复连接后可以重试', async ({ page }) => {
  let fail = true;
  await page.route(/\/assets\/DomainDetails-[^/]+\.js$/, async (route) => {
    if (fail) await route.fulfill({ status: 503, body: 'QA temporary module failure' });
    else await route.continue();
  });
  await open(page);
  await page.getByRole('button', { name: '身体', exact: true }).click();
  await expect(page.locator('.toast')).toContainText('模块暂时无法打开');
  await expect(page).toHaveURL(/#overview$/);
  await expect(page.locator('.route-content')).toHaveAttribute('data-view', 'overview');
  await expect(page.locator('#page-main')).toHaveAttribute('aria-busy', 'false');
  fail = false;
  await go(page, '身体', 'body');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('身体状况');
});
