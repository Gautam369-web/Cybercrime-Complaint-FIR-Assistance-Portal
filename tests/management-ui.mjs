import {chromium} from '@playwright/test';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const page=await context.newPage();
const email=`ui-test-${Date.now()}@example.com`,password='Synthetic-local-test-123!';
try{
await page.goto('http://127.0.0.1:5174/#account');
await page.getByRole('button',{name:'New here? Create an account'}).click();
await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Create account',exact:true}).click();
await page.getByText('Account created. You can now sign in.').waitFor();
const db=new DatabaseSync('data/portal.sqlite');db.prepare("UPDATE users SET role='admin' WHERE email=?").run(email);db.close();
await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
await page.getByRole('button',{name:'New complaint',exact:true}).click();await page.getByLabel('Complaint title / type').fill('Synthetic UI verification');await page.getByLabel('What happened?',{exact:true}).fill('This is a synthetic report used to verify the management interface and human review.');await page.getByRole('checkbox').first().check();await page.getByRole('button',{name:'Submit to portal',exact:true}).click();
await page.getByText('Submitted for human review. Add supporting files below.').waitFor();
await page.getByLabel('Decision reason or update (visible to applicant)').fill('Synthetic review completed successfully.');await page.getByLabel('Next status').selectOption('approved');await page.getByRole('button',{name:'Save admin decision'}).click();await page.getByText('Synthetic review completed successfully.').waitFor();
await page.getByRole('button',{name:'Admin review queue',exact:true}).click();await page.getByRole('button',{name:'View application',exact:true}).first().waitFor();
const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();await page.screenshot({path:'docs/qa/admin-queue.png',fullPage:true});
await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'docs/qa/admin-mobile.png',fullPage:true});
await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();console.log(JSON.stringify({workflow:'register/login/submit/admin approve/track/logout passed',violations:a.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))}));
}finally{await browser.close();const db=new DatabaseSync('data/portal.sqlite');const u=db.prepare('SELECT id FROM users WHERE email=?').get(email);if(u){db.prepare('DELETE FROM events WHERE actor=?').run(u.id);db.prepare('DELETE FROM complaints WHERE owner=?').run(u.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);db.prepare('DELETE FROM users WHERE id=?').run(u.id);}db.close();}
