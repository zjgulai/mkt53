#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const requireFromApp = createRequire(resolve(repoRoot, 'app/package.json'));
const { chromium } = requireFromApp('@playwright/test');

const [input, output, widthArg = '2400'] = process.argv.slice(2);

if (!input || !output) {
  console.error('Usage: node render-excalidraw-with-app-playwright.mjs <input.excalidraw> <output.png> [width]');
  process.exit(1);
}

const skillTemplate = '/Users/pray/.agents/skills/excalidraw-diagram-generator/references/render_template.html';
const data = JSON.parse(readFileSync(input, 'utf8'));

function bounds(elements) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of elements) {
    if (el.isDeleted) continue;
    if ((el.type === 'arrow' || el.type === 'line') && Array.isArray(el.points)) {
      for (const [px, py] of el.points) {
        minX = Math.min(minX, el.x + px);
        minY = Math.min(minY, el.y + py);
        maxX = Math.max(maxX, el.x + px);
        maxY = Math.max(maxY, el.y + py);
      }
      continue;
    }
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + Math.abs(el.width ?? 0));
    maxY = Math.max(maxY, el.y + Math.abs(el.height ?? 0));
  }
  if (!Number.isFinite(minX)) return { width: 1200, height: 800 };
  return {
    width: Math.min(Number(widthArg), Math.ceil(maxX - minX + 180)),
    height: Math.max(720, Math.ceil(maxY - minY + 180)),
  };
}

const viewport = bounds(data.elements ?? []);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
page.on('console', (message) => {
  if (message.type() === 'error') {
    console.error(`browser console error: ${message.text()}`);
  }
});
await page.goto(pathToFileURL(skillTemplate).href);
await page.waitForFunction('window.__moduleReady === true', null, { timeout: 120_000 });
const result = await page.evaluate((diagram) => window.renderDiagram(diagram), data);
if (!result?.success) {
  await browser.close();
  throw new Error(result?.error ?? 'Excalidraw render failed');
}
await page.waitForFunction('window.__renderComplete === true', null, { timeout: 15_000 });
const svg = await page.$('#root svg');
if (!svg) {
  await browser.close();
  throw new Error('No SVG element after render');
}
await svg.screenshot({ path: output });
await browser.close();
console.log(output);
