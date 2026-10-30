import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
const page=await context.newPage();await page.goto('http://127.0.0.1:5174/');
const results=[];
for(const theme of ['Frost','Obsidian']){
 await page.locator('.appearance-picker').getByRole('button',{name:theme,exact:true}).click();
 for(const size of [{width:1440,height:900},{width:390,height:844}]){
  await page.setViewportSize(size);await page.getByRole('button',{name:'Settings',exact:true}).click();
  const dialog=page.getByRole('dialog');assert.equal(await dialog.getByRole('radio').count(),7);
  await dialog.getByRole('radio',{name:'हिन्दी',exact:true}).check();assert.equal(await page.locator('html').getAttribute('lang'),'hi');
  await dialog.getByRole('radio',{name:'English',exact:true}).check();
  const layout=await dialog.evaluate(el=>({client:el.clientHeight,scroll:el.scrollHeight,rootOverflow:document.documentElement.style.overflow,bar:getComputedStyle(el).scrollbarWidth}));
  assert.equal(layout.rootOverflow,'hidden');assert.equal(layout.bar,'none');assert.ok(layout.scroll<=layout.client+1,'Settings fits normal viewport');
  const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  results.push({theme,width:size.width,layout,violations:a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)}))});
  await page.screenshot({path:`docs/qa/settings-${theme}-${size.width}.png`});
  await page.keyboard.press('Escape');assert.equal(await page.locator('html').evaluate(el=>el.style.overflow),'');
 }
}
await page.setViewportSize({width:320,height:568});await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('switch',{name:'Simple 2D view',exact:true}).focus();assert.ok(await page.getByRole('switch',{name:'Simple 2D view',exact:true}).isVisible());
console.log(JSON.stringify(results,null,2));await browser.close();
