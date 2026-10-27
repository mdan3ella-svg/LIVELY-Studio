// LIVELY Chromium smoke QA: handles automatic OR manual boot, records stage and diagnostics.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
const root = process.cwd();
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.wasm':'application/wasm'};
const server = createServer((req,res)=>{
  try {
    const url = new URL(req.url,'http://localhost');
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const path = resolve(root,rel || 'index.html');
    if (path !== root && !path.startsWith(root + sep)) {res.writeHead(403).end();return;}
    if (!existsSync(path) || !statSync(path).isFile()) {res.writeHead(404).end();return;}
    res.setHeader('Content-Type',mime[extname(path)] || 'application/octet-stream');
    res.end(readFileSync(path));
  } catch(e) {res.writeHead(400).end(String(e));}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let browser, page, stage='launch';
const failures=[], consoleErrors=[], requestFailures=[];
try {
  const url = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
  page = await browser.newPage({viewport:{width:1360,height:850}});
  page.on('pageerror',e=>failures.push(e.message));
  page.on('console',m=>{if(m.type()==='error') consoleErrors.push(m.text());});
  page.on('requestfailed',r=>requestFailures.push(`${r.method()} ${r.url()}: ${r.failure()?.errorText}`));
  stage='navigate';
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  stage='core ready';
  await page.waitForFunction(()=>window.__arxeReady===true,{timeout:15000});
  stage='enter editor';
  // Normal startup enters automatically; do not click a button that may already disappear.
  try {
    await page.waitForSelector('#app.on',{timeout:5000});
  } catch {
    const button=page.locator('#bootstart');
    if(await button.isVisible()) await button.click({timeout:3000});
    await page.waitForSelector('#app.on',{timeout:8000});
  }
  console.log('PASS boot, editor visible');
  stage='create 2D rectangle';
  await page.locator('#addrow [data-add="rect"]').click({timeout:8000});
  const core=await page.evaluate(()=>({nodes:document.querySelectorAll('#tree .tnode').length,qa:window.LIVELY_QA?.run(),ui:!!window.LIVELY}));
  if(core.nodes<1)throw Error('2D hierarchy empty after clicking Add Rect');
  if(!core.ui)throw Error('LIVELY extension missing');
  console.log('PASS 2D create, LIVELY extension',JSON.stringify(core));
  stage='open 3D';
  await page.locator('#btn-3d').click({timeout:10000});
  await page.waitForSelector('#app3d.on',{timeout:15000});
  stage='load 3D libraries';
  await page.waitForFunction(()=>!!window.THREE && !!window.THREE.GLTFLoader,{timeout:30000});
  stage='3D world and LIVELY';
  await page.waitForFunction(()=>!!window.__ARXE3D_ED?.world && typeof window.__arxe3dSerialize==='function',{timeout:15000});
  const state=await page.evaluate(()=>({renderer:!!window.THREE,loader:!!window.THREE.GLTFLoader,scene:typeof window.__arxe3dSerialize,sceneNodes:window.__ARXE3D_ED?.data?.nodes?.length ?? null}));
  if(failures.length)throw Error('Uncaught JS errors: '+failures.join(' | '));
  console.log('PASS 3D initialization',JSON.stringify(state));
  console.log('PASS LIVELY Chromium smoke QA');
} catch(err) {
  console.error('FAIL LIVELY QA at stage:',stage,'\n',err?.stack || err);
  console.error('JS errors:',JSON.stringify(failures));
  console.error('Console errors:',JSON.stringify(consoleErrors.slice(-20)));
  console.error('Network failures:',JSON.stringify(requestFailures.slice(-20)));
  if(page){
    console.error('App state:',JSON.stringify(await page.evaluate(()=>({ready:window.__arxeReady,boot:document.getElementById('boot')?.className,app:document.getElementById('app')?.className,app3d:document.getElementById('app3d')?.className,bootError:document.getElementById('bootfault')?.innerText,offline:!!window.LIVELY_OFFLINE,three:!!window.THREE,loader:!!window.THREE?.GLTFLoader})).catch(e=>({inspectionError:String(e)}))));
    await page.screenshot({path:'lively-smoke-failed.png',fullPage:true}).catch(()=>{});
  }
  process.exitCode=1;
} finally {
  await browser?.close().catch(()=>{});
  await new Promise(ok=>server.close(ok));
}
