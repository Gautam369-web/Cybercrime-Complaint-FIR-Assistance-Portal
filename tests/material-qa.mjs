import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const page=await context.newPage();
const results=[];
await page.goto('http://127.0.0.1:5174/');await page.waitForTimeout(1500);
for(const theme of ['Obsidian','Frost']){
 await page.locator('.appearance-picker').getByRole('button',{name:theme,exact:true}).click();
 for(const mobile of [false,true]){
  await page.setViewportSize(mobile?{width:390,height:844}:{width:1440,height:1000});await page.waitForTimeout(350);
  await page.screenshot({path:`docs/qa/material-${theme}-${mobile?'mobile':'desktop'}.png`,fullPage:true});
  const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  results.push({theme,mobile,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),violations:a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
 }
}
await fs.writeFile('docs/qa/material-report.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await browser.close();
