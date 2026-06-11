#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const requireFromApp = createRequire(resolve(repoRoot, 'app/package.json'));
const { chromium } = requireFromApp('@playwright/test');

const [input, output, widthArg = '2400'] = process.argv.slice(2);

if (!input || !output) {
  console.error('Usage: node render-excalidraw-fallback.mjs <input.excalidraw> <output.png> [width]');
  process.exit(1);
}

const data = JSON.parse(readFileSync(input, 'utf8'));
const elements = (data.elements ?? []).filter((element) => !element.isDeleted);

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function elementBounds(el) {
  if ((el.type === 'arrow' || el.type === 'line') && Array.isArray(el.points)) {
    const points = el.points.map(([px, py]) => [el.x + px, el.y + py]);
    return {
      minX: Math.min(...points.map(([x]) => x)),
      minY: Math.min(...points.map(([, y]) => y)),
      maxX: Math.max(...points.map(([x]) => x)),
      maxY: Math.max(...points.map(([, y]) => y)),
    };
  }
  return {
    minX: el.x,
    minY: el.y,
    maxX: el.x + Math.abs(el.width ?? 0),
    maxY: el.y + Math.abs(el.height ?? 0),
  };
}

const allBounds = elements.map(elementBounds);
const minX = Math.min(...allBounds.map((b) => b.minX), 0) - 60;
const minY = Math.min(...allBounds.map((b) => b.minY), 0) - 60;
const maxX = Math.max(...allBounds.map((b) => b.maxX), 1200) + 60;
const maxY = Math.max(...allBounds.map((b) => b.maxY), 800) + 60;
const svgWidth = Math.ceil(maxX - minX);
const svgHeight = Math.ceil(maxY - minY);
const viewportWidth = Math.min(Number(widthArg), svgWidth);
const viewportHeight = Math.max(720, Math.ceil(svgHeight * (viewportWidth / svgWidth)));

function tx(x) {
  return x - minX;
}

function ty(y) {
  return y - minY;
}

function strokeDash(el) {
  if (el.strokeStyle === 'dashed') return 'stroke-dasharray="10 8"';
  if (el.strokeStyle === 'dotted') return 'stroke-dasharray="2 8"';
  return '';
}

function roughStroke(shape, attrs, stroke, width = 2, dash = '') {
  return `
    <${shape} ${attrs} fill="none" stroke="${stroke}" stroke-width="${width + 1}" ${dash} opacity="0.22" transform="translate(1.8 1.2)" />
    <${shape} ${attrs} fill="none" stroke="${stroke}" stroke-width="${width}" ${dash} opacity="0.92" />
  `;
}

function rect(el) {
  const x = tx(el.x);
  const y = ty(el.y);
  const fill = el.backgroundColor === 'transparent' ? 'none' : el.backgroundColor;
  const dash = strokeDash(el);
  const attrs = `x="${x}" y="${y}" width="${Math.abs(el.width)}" height="${Math.abs(el.height)}" rx="12" ry="12"`;
  return `
    <rect ${attrs} fill="${fill}" opacity="${fill === 'none' ? 1 : 0.78}" stroke="none" />
    ${roughStroke('rect', attrs, el.strokeColor, el.strokeWidth ?? 2, dash)}
  `;
}

function diamond(el) {
  const x = tx(el.x);
  const y = ty(el.y);
  const w = Math.abs(el.width);
  const h = Math.abs(el.height);
  const points = `${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`;
  const fill = el.backgroundColor === 'transparent' ? 'none' : el.backgroundColor;
  const dash = strokeDash(el);
  return `
    <polygon points="${points}" fill="${fill}" opacity="${fill === 'none' ? 1 : 0.78}" stroke="none" />
    ${roughStroke('polygon', `points="${points}"`, el.strokeColor, el.strokeWidth ?? 2, dash)}
  `;
}

function ellipse(el) {
  const x = tx(el.x);
  const y = ty(el.y);
  const fill = el.backgroundColor === 'transparent' ? 'none' : el.backgroundColor;
  const attrs = `cx="${x + Math.abs(el.width) / 2}" cy="${y + Math.abs(el.height) / 2}" rx="${Math.abs(el.width) / 2}" ry="${Math.abs(el.height) / 2}"`;
  return `
    <ellipse ${attrs} fill="${fill}" opacity="${fill === 'none' ? 1 : 0.78}" stroke="none" />
    ${roughStroke('ellipse', attrs, el.strokeColor, el.strokeWidth ?? 2, strokeDash(el))}
  `;
}

function lineOrArrow(el) {
  const points = el.points.map(([px, py]) => [tx(el.x + px), ty(el.y + py)]);
  const [start, end] = [points[0], points.at(-1)];
  const marker = el.endArrowhead ? 'marker-end="url(#arrowhead)"' : '';
  const dash = strokeDash(el);
  return `
    <line x1="${start[0] + 1.8}" y1="${start[1] + 1.2}" x2="${end[0] + 1.8}" y2="${end[1] + 1.2}" stroke="${el.strokeColor}" stroke-width="${(el.strokeWidth ?? 2) + 1}" ${dash} opacity="0.2" ${marker}/>
    <line x1="${start[0]}" y1="${start[1]}" x2="${end[0]}" y2="${end[1]}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth ?? 2}" ${dash} opacity="0.92" ${marker}/>
  `;
}

function textElement(el) {
  const fontSize = el.fontSize ?? 16;
  const lines = String(el.text ?? '').split('\n');
  const x = tx(el.x);
  const y = ty(el.y) + fontSize;
  const anchor = el.textAlign === 'center' ? 'middle' : el.textAlign === 'right' ? 'end' : 'start';
  const anchorX = el.textAlign === 'center' ? x + (el.width ?? 0) / 2 : el.textAlign === 'right' ? x + (el.width ?? 0) : x;
  const tspans = lines.map((line, index) => `<tspan x="${anchorX}" dy="${index === 0 ? 0 : fontSize * 1.25}">${escapeXml(line)}</tspan>`).join('');
  return `<text x="${anchorX}" y="${y}" fill="${el.strokeColor}" font-size="${fontSize}" font-family="Menlo, Monaco, monospace" text-anchor="${anchor}" dominant-baseline="alphabetic">${tspans}</text>`;
}

function renderElement(el) {
  if (el.type === 'rectangle') return rect(el);
  if (el.type === 'diamond') return diamond(el);
  if (el.type === 'ellipse') return ellipse(el);
  if (el.type === 'arrow' || el.type === 'line') return lineOrArrow(el);
  if (el.type === 'text') return textElement(el);
  return '';
}

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto" markerUnits="strokeWidth">
      <path d="M 0 0 L 10 4 L 0 8 z" fill="#1e3a5f" opacity="0.9" />
    </marker>
    <filter id="paper">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" result="noise"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.025"/>
      </feComponentTransfer>
      <feBlend mode="multiply" in2="SourceGraphic"/>
    </filter>
  </defs>
  <rect x="0" y="0" width="100%" height="100%" fill="#ffffff"/>
  <g filter="url(#paper)">
    ${elements.map(renderElement).join('\n')}
  </g>
</svg>`;

const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:white}svg{display:block}</style>${svg}`;
const svgPath = output.replace(/\.png$/i, '.svg');
const normalizedSvg = svg.replace(/[ \t]+$/gm, '');
writeFileSync(svgPath, normalizedSvg);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: viewportWidth, height: viewportHeight }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: 'load' });
await page.locator('svg').screenshot({ path: output });
await browser.close();
console.log(output);
