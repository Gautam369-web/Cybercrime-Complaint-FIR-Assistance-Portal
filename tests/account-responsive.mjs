import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({channel:'chrome',headless:true});
const context = await browser.newContext({reducedMotion:'reduce',viewport:{width:1440,height:1000}});
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
 await page.goto('http://127.0.0.1:5174/#account');
 await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();
 for (const width of [320,390,768,1440]) {
  await page.setViewportSize({width,height:900});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Login overflows at ${width}`);
  const form = await page.locator('.auth-card').boundingBox();
  assert.ok(form.x>=0 && form.x+form.width<=width,`Form exceeds viewport at ${width}`);
  await page.getByRole('button',{name:'New here? Create an account',exact:true}).click();
  await page.getByRole('button',{name:'Create account',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.getByRole('button',{name:'Already registered? Sign in',exact:true}).click();
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('button',{name:'Keep the evidence',exact:true}).click();
 await page.waitForTimeout(400);
 assert.equal(await page.locator('.journey-step-tabs button[aria-pressed=true]').innerText(),'Keep the evidence');
 await page.getByRole('button',{name:'Next explanation',exact:true}).click();
 assert.equal(await page.locator('.journey-step-tabs button[aria-pressed=true]').innerText(),'Review your complaint');
 await page.getByRole('button',{name:'Simple view',exact:true}).click();
 assert.ok(await page.locator('.journey-flat').isVisible());
 await page.getByRole('button',{name:'Explore in 3D',exact:true}).click();
 await page.waitForTimeout(1200);
 const axe = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
 await page.screenshot({path:'docs/qa/account-3d-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'docs/qa/account-3d-mobile.png',fullPage:true});
 await page.getByLabel('Email',{exact:true}).fill('demo.tracking@example.com');
 await page.getByLabel('Password',{exact:true}).fill('VillageDemo!2026');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('button',{name:'New complaint',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Application dashboard overflows');
 await page.getByRole('button',{name:'New complaint',exact:true}).click();
 await page.getByLabel('Complaint title / type').waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Submission form overflows');
 await page.getByRole('button',{name:'Sign out',exact:true}).click();
 console.log(JSON.stringify({widths:[320,390,768,1440],flow:'login/register/walkthrough/2D fallback/application dashboard/submission form',errors,violations:axe.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))},null,2));
} finally {await browser.close();}
