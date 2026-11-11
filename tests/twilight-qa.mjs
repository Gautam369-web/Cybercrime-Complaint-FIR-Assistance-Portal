import {chromium, devices} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const browser = await chromium.launch({channel:'chrome',headless:true});
const context = await browser.newContext({viewport:{width:1440,height:1000}});
const page = await context.newPage();
const report = {contrast:[],checks:[],performance:[],accessibility:[]};
const luminance = rgb => rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
await fs.mkdir('docs/qa',{recursive:true});
try {
 await page.goto('http://127.0.0.1:5174/');
 await page.locator('.twilight-background').waitFor();
 assert.equal(await page.locator('.twilight-background').getAttribute('data-static'),'false');
 await page.mouse.move(1300,200);await page.waitForTimeout(600);
 assert.notEqual(await page.locator('.twilight-background').evaluate(el=>el.style.getPropertyValue('--valley-x')),'0px');
 report.checks.push('Pointer parallax responds');
 await page.getByRole('tab',{name:'Help',exact:true}).click();
 assert.equal(await page.locator('.twilight-background').getAttribute('data-focused'),'true');
 await page.waitForTimeout(900);
 const camera1=await page.locator('.twilight-background').evaluate(el=>el.style.getPropertyValue('--valley-x'));
 await page.getByRole('tab',{name:'Status',exact:true}).click();await page.waitForTimeout(1000);
 assert.notEqual(await page.locator('.twilight-background').evaluate(el=>el.style.getPropertyValue('--valley-x')),camera1);
 report.checks.push('Building focus dims/blurs and segment changes shift background');
 await page.getByRole('tab',{name:'Home',exact:true}).click();
 for(const theme of ['Obsidian','Frost']) {
  await page.locator('.appearance-picker').getByRole('button',{name:theme,exact:true}).click();
  if(theme==='Frost'){await page.waitForTimeout(200);const alpha=await page.locator('.variant-frost').evaluate(el=>Number(getComputedStyle(el).opacity));assert.ok(alpha>0&&alpha<1,'Theme opacity interpolates');report.checks.push('Theme switch visibly cross-fades');}
  await page.waitForTimeout(1300);
  for(const location of ['bright','dark']) {
   await page.evaluate(location=>{const card=document.createElement('div');card.id='contrast-test';card.className='glass card language-card';card.style.cssText=`position:fixed;z-index:100;left:72%;top:${location==='bright'?'15%':'75%'};width:230px;padding:24px`;card.innerHTML='<h2>Readable glass heading</h2><p class="muted">Supporting information</p>';document.querySelector('.portal-root').append(card);},location);
   for(const selector of ['h2','p']) {
    const target=page.locator('#contrast-test '+selector);
    const textColor=await target.evaluate(el=>getComputedStyle(el).color.match(/[\d.]+/g).slice(0,3).map(Number));
    const bounds=await target.boundingBox();await target.evaluate(el=>el.style.visibility='hidden');
    const {data,info}=await sharp(await page.screenshot()).removeAlpha().raw().toBuffer({resolveWithObject:true});
    const foreground=luminance(textColor);let worst=21;
    for(let x=Math.ceil(bounds.x)+2;x<bounds.x+bounds.width-2;x+=8)for(let y=Math.ceil(bounds.y)+2;y<bounds.y+bounds.height-2;y+=5){const offset=(y*info.width+x)*info.channels;const bg=luminance([...data.subarray(offset,offset+3)]);const ratio=(Math.max(bg,foreground)+.05)/(Math.min(bg,foreground)+.05);worst=Math.min(worst,ratio);}
    await target.evaluate(el=>el.style.visibility='');report.contrast.push({theme,location,text:selector,minRatio:Number(worst.toFixed(2))});assert.ok(worst>=4.5,`${theme} ${location} ${selector}: ${worst}`);
   }
   await page.locator('#contrast-test').evaluate(el=>el.remove());
  }
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();report.accessibility.push({theme,violations:axe.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))});
  await page.screenshot({path:`docs/qa/twilight-${theme.toLowerCase()}-desktop.png`,fullPage:true});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(300);
 assert.equal(await page.locator('.twilight-background').getAttribute('data-static'),'true');
 await page.locator('.twilight-background img').last().evaluate(img=>img.decode());
 report.checks.push('Reduced motion uses decoded static WebP');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.getByRole('button',{name:'Simple 2D view',exact:true}).click();
 assert.equal(await page.locator('.twilight-background').getAttribute('data-static'),'true');report.checks.push('2D mode uses static wallpaper');
 await page.getByRole('button',{name:'Explore in 3D',exact:true}).click();
 const mobile=await browser.newContext({...devices['Pixel 7'],viewport:{width:412,height:915}});
 const phone=await mobile.newPage();await phone.goto('http://127.0.0.1:5174/');await phone.locator('.twilight-background').waitFor();await phone.waitForTimeout(1500);
 const cdp=await mobile.newCDPSession(phone);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await phone.bringToFront();
 const timing=await phone.evaluate(()=>new Promise(resolve=>{const frames=[];let start=performance.now(),last=start;const frame=now=>{frames.push(now-last);last=now;if(now-start<5000)requestAnimationFrame(frame);else resolve({frames:frames.length,durationMs:now-start,averageFps:frames.length*1000/(now-start),p95FrameMs:frames.sort((a,b)=>a-b)[Math.floor(frames.length*.95)]});};requestAnimationFrame(frame);}));
 report.performance.push({environment:'Desktop Chrome Pixel 7 emulation, 4× CPU throttle, full village + wallpaper',...timing});
 assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await phone.screenshot({path:'docs/qa/twilight-mobile.png',fullPage:true});
 const staticMode=await phone.locator('.twilight-background').getAttribute('data-static');
 report.performance[0].staticFallbackAfterSample=staticMode==='true';
 await mobile.close();
 const tiltContext=await browser.newContext({...devices['Pixel 7']});const tiltPage=await tiltContext.newPage();await tiltPage.goto('http://127.0.0.1:5174/');await tiltPage.locator('.twilight-background').waitFor();
 await tiltPage.evaluate(()=>window.dispatchEvent(new Event('twilight:enable-tilt')));await tiltPage.evaluate(()=>window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{gamma:20,beta:45})));await tiltPage.waitForTimeout(700);
 assert.notEqual(await tiltPage.locator('.twilight-background').evaluate(el=>el.style.getPropertyValue('--valley-x')),'0px');report.checks.push('Synthetic tilt updates mobile parallax after opt-in');await tiltContext.close();
 const wallpaperContext=await browser.newContext({...devices['Pixel 7']});const wallpaperPage=await wallpaperContext.newPage();await wallpaperPage.goto('http://127.0.0.1:5174/tools/wallpaper-render.html');await wallpaperPage.locator('.twilight-background').waitFor();
 await wallpaperPage.evaluate(()=>document.querySelector('.twilight-background').removeAttribute('data-render'));await wallpaperPage.bringToFront();
 const wallpaperCdp=await wallpaperContext.newCDPSession(wallpaperPage);await wallpaperCdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 const wallpaperFps=await wallpaperPage.evaluate(()=>new Promise(resolve=>{let count=0,start=performance.now();const tick=time=>{count++;if(time-start<2000)requestAnimationFrame(tick);else resolve(count*1000/(time-start));};requestAnimationFrame(tick);}));
 report.performance.push({environment:'Ambient wallpaper layers alone, mobile viewport, 4× CPU throttle',averageFps:wallpaperFps});await wallpaperContext.close();
 const low=await browser.newContext({viewport:{width:390,height:844}});await low.addInitScript(()=>Object.defineProperty(navigator,'deviceMemory',{value:2}));const lowPage=await low.newPage();await lowPage.goto('http://127.0.0.1:5174/');await lowPage.locator('.twilight-background[data-static=true]').waitFor();await lowPage.locator('img[src*="twilight-frost"],img[src*="twilight-obsidian"]').first().evaluate(img=>img.decode());report.checks.push('2GB device selects mobile static fallback');await low.close();
 const noGpu=await browser.newContext();await noGpu.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return String(type).startsWith('webgl')?null:original.call(this,type,...args);};});const noGpuPage=await noGpu.newPage();await noGpuPage.goto('http://127.0.0.1:5174/');await noGpuPage.locator('.twilight-background[data-static=true]').waitFor();report.checks.push('No WebGL selects static wallpaper');await noGpu.close();
 const broken=await browser.newContext();await broken.addInitScript(()=>Object.defineProperty(navigator,'deviceMemory',{value:2}));await broken.route('**/wallpapers/**',route=>route.abort());const brokenPage=await broken.newPage();await brokenPage.goto('http://127.0.0.1:5174/');await brokenPage.locator('.twilight-background[data-static=true]').waitFor();assert.ok((await brokenPage.locator('.variant-obsidian').evaluate(el=>getComputedStyle(el).backgroundImage)).includes('linear-gradient'));report.checks.push('Missing wallpaper retains theme gradient');await broken.close();
 console.log(JSON.stringify(report,null,2));
} finally {await fs.writeFile('docs/qa/twilight-report.json',JSON.stringify(report,null,2));await browser.close();}
