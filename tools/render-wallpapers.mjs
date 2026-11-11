import {chromium} from '@playwright/test';
import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';

const browser = await chromium.launch({channel: 'chrome', headless: true});
const context = await browser.newContext();
const page = await context.newPage();
await mkdir('public/wallpapers', {recursive: true});
try {
  for (const theme of ['obsidian', 'frost']) {
    for (const [name, width, height] of [['desktop', 1920, 1080], ['mobile', 720, 1280]]) {
      await page.setViewportSize({width, height});
      await page.goto(`http://127.0.0.1:5174/tools/wallpaper-render.html?theme=${theme}`);
      await page.locator(`.twilight-${theme}`).waitFor();
      await page.waitForTimeout(100);
      const frame = await page.screenshot();
      await sharp(frame).webp({quality: 85}).toFile(`public/wallpapers/twilight-${theme}-${name}.webp`);
      console.log(`Rendered ${theme} ${name}, ${width} × ${height}`);
    }
  }
} finally {await browser.close();}
