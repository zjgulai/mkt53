import { expect, test } from '@playwright/test';

const pages = [
  { path: '/', title: /Momcozy 市场洞察工作台/ },
  { path: '/#/market', title: /市场总览/ },
  { path: '/#/market/customs', title: /海关数据/ },
  { path: '/#/competition', title: /竞品库/ },
  { path: '/#/competition/products', title: /竞品产品信息管理/ },
  { path: '/#/users', title: /用户洞察来源口径/ },
  { path: '/#/users/consumer', title: /消费者深度访谈/ },
  { path: '/#/industry', title: /全球母婴标准与法规地图/ },
  { path: '/#/industry/regulation', title: /行业法规与标准解读/ },
  { path: '/#/industry/supply', title: /供应链情报/ },
  { path: '/#/self', title: /看自己/ },
  { path: '/#/data', title: /数据管理/ },
  { path: '/#/data-source', title: /数据来源管理/ },
  { path: '/#/ai-assistant', title: /AI 助手/ },
  { path: '/#/ai-assistant/review-analysis', title: /评论分析/ },
  { path: '/#/ai-assistant/youtube', title: /YouTube测评/ },
  { path: '/#/ai-assistant/design', title: /产品设计助手/ },
  { path: '/#/ai-assistant/knowledge', title: /知识库检索/ },
  { path: '/#/ai-assistant/comment-data', title: /评论数据/ },
  { path: '/#/ai-assistant/web-review', title: /网站评测分析/ },
  { path: '/#/ai-gallery', title: /AI 画廊/ },
  { path: '/#/reports', title: /报告中心/ },
  { path: '/#/report/r009', title: /2026年Q1全球吸奶器市场竞争格局报告/ },
];

test.describe('core pages visual guard', () => {
  for (const pageConfig of pages) {
    test(`${pageConfig.path} renders without console errors or horizontal overflow`, async ({ page }, testInfo) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      page.on('console', (message) => {
        if (message.type() === 'error') {
          consoleErrors.push(message.text());
        }
      });
      page.on('pageerror', (error) => {
        pageErrors.push(error.message);
      });

      await page.goto(pageConfig.path);
      await expect(page.getByText(pageConfig.title).filter({ visible: true }).first()).toBeVisible();
      await page.waitForLoadState('networkidle');

      if (pageConfig.path === '/') {
        await expect(page.getByText(/半月数据周期 2026-06-H1/)).toBeVisible();
        await expect(page.getByText(/连接器待接入/).first()).toBeVisible();
      }

      if (pageConfig.path === '/#/data') {
        await expect(page.getByText('半月数据采集刷新')).toBeVisible();
      }

      if (pageConfig.path === '/#/data-source') {
        await expect(page.getByText('半月数据状态')).toBeVisible();
        await expect(page.getByText('补证任务')).toBeVisible();
        await expect(page.getByText('查看补证队列')).toBeVisible();
        await expect(page.getByText(/服务器出口边界/)).toBeVisible();
      }

      if (pageConfig.path === '/#/market') {
        await expect(page.getByText('市场总览来源口径')).toBeVisible();
      }

      if (pageConfig.path === '/#/market/customs') {
        await expect(page.getByText('海关数据示例口径')).toBeVisible();
      }

      if (pageConfig.path === '/#/competition') {
        await expect(page.getByText('竞品库采集状态')).toBeVisible();
      }

      if (pageConfig.path === '/#/competition/products') {
        await expect(page.getByText('产品库数据待采集复核')).toBeVisible();
      }

      if (pageConfig.path === '/#/users') {
        await expect(page.getByText('用户洞察来源口径')).toBeVisible();
      }

      if (pageConfig.path === '/#/users/consumer') {
        await expect(page.getByText('消费者访谈样本口径')).toBeVisible();
      }

      if (pageConfig.path === '/#/industry') {
        await expect(page.getByText('行业总览来源口径')).toBeVisible();
      }

      if (pageConfig.path === '/#/industry/regulation') {
        await expect(page.getByText('法规详情复核边界')).toBeVisible();
      }

      if (pageConfig.path === '/#/industry/supply') {
        await expect(page.getByText('供应链数据示例口径')).toBeVisible();
      }

      if (pageConfig.path === '/#/self') {
        await expect(page.getByText('自我诊断来源口径')).toBeVisible();
      }

      if (pageConfig.path === '/#/ai-assistant') {
        await expect(page.getByText('AI助手演示边界')).toBeVisible();
      }

      if (pageConfig.path === '/#/ai-assistant/review-analysis') {
        await expect(page.getByText('评论分析示例口径')).toBeVisible();
      }

      if (pageConfig.path === '/#/ai-assistant/youtube') {
        await expect(page.getByText('YouTube测评示例口径')).toBeVisible();
      }

      if (pageConfig.path === '/#/ai-assistant/design') {
        await expect(page.getByText('设计助手代理与审核边界')).toBeVisible();
      }

      if (pageConfig.path === '/#/ai-assistant/knowledge') {
        await expect(page.getByText('知识库版本化状态')).toBeVisible();
      }

      if (pageConfig.path === '/#/ai-assistant/comment-data') {
        await expect(page.getByText('评论数据模型复核口径')).toBeVisible();
      }

      if (pageConfig.path === '/#/ai-assistant/web-review') {
        await expect(page.getByText('网页评论合规口径')).toBeVisible();
      }

      if (pageConfig.path === '/#/ai-gallery') {
        await expect(page.getByText('AI图库素材口径')).toBeVisible();
      }

      if (pageConfig.path === '/#/reports') {
        await expect(page.getByText('报告目录元数据口径')).toBeVisible();
        await expect(page.getByText('半月精选2-3份报告线索推送')).toBeVisible();
      }

      if (pageConfig.path === '/#/report/r009') {
        await expect(page.getByText('报告内容来源边界')).toBeVisible();
        await expect(page.getByText(/公开页样例与待采集任务复核/)).toBeVisible();
      }

      await page.screenshot({
        path: testInfo.outputPath(`${testInfo.project.name}-${pageConfig.path.replace(/[^a-z0-9]+/gi, '-') || 'home'}.png`),
        fullPage: true,
      });

      const hasHorizontalOverflow = await page.evaluate(() => {
        const documentWidth = document.documentElement.scrollWidth;
        const viewportWidth = document.documentElement.clientWidth;
        return documentWidth > viewportWidth + 1;
      });

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
      expect(hasHorizontalOverflow).toBe(false);
    });
  }
});
