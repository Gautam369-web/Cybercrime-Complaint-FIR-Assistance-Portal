import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

const out = 'screenshots/pages';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
try {
  await page.goto('http://127.0.0.1:5174/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const shot = async name => page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  await shot('01-home');
  await page.getByRole('button', { name: 'Report a cybercrime', exact: true }).click();
  await shot('02-privacy-consent');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Begin my complaint', exact: true }).click();
  await shot('03-assistant');
  const answers = ['Sample User', 'sample@example.com', 'Delhi, Delhi', 'UPI / online fraud', '2026-10-01T10:30', '5000', 'TX-DEMO-123', 'unknown@example.com', 'Example payment app', 'This is sample information for demonstrating the complaint preparation flow.'];
  for (const [index, answer] of answers.entries()) {
    await page.locator('#answer').fill(answer);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    if (index < answers.length - 1) await page.getByText(`Question ${index + 2} of 10`, { exact: true }).waitFor();
  }
  await page.getByRole('heading', { name: 'A safe place for the details.' }).waitFor();
  await shot('04-evidence');
  await page.getByRole('button', { name: 'Review complaint', exact: true }).click();
  await page.getByRole('heading', { name: 'Your complaint is ready' }).waitFor().catch(() => {});
  await shot('05-review');
  const reviewConsent = page.getByRole('checkbox').last();
  await reviewConsent.check();
  await page.getByRole('button', { name: 'Confirm demo complaint', exact: true }).click();
  await shot('06-status');
  await page.getByRole('tab', { name: 'Help', exact: true }).click();
  await shot('07-help');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await shot('08-settings');
  await page.goto('http://127.0.0.1:5174/#account', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Welcome back' }).waitFor();
  await shot('09-account-sign-in');
  await page.getByRole('button', { name: 'New here? Create an account' }).click({ force: true });
  await shot('10-account-create');
} finally {
  await browser.close();
}
console.log(`Screenshots saved in ${out}`);
