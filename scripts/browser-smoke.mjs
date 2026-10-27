// Runs in GitHub Actions (Playwright Chromium), against the generated Pages directory.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync,existsSync } from 'node:fs';
import { resolve,extname } from 'node:path';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const root=process.cwd();
const server=createServer((req,res)=>{const path=resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!path.startsWith(root+'/')&&!path.endsWith(root)){res.writeHead(403).end();return}const file=path.endsWith('/')?path+'index.html':path;if(!existsSync(file)){res.writeHead(404).end();return}res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const url=`http://127.0.0.1:${server.address().port}/`;
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
let errors=[];const page=await browser.newPage({viewport:{width:1360,height:850}});
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.__arxeReady===true,{timeout:15000});
 await page.locator('#bootstart').click();
 await page.waitForSelector('#app.on',{timeout:8000});
 await page.locator('#addrow [data-add="rect"]').click();
 const core=await page.evaluate(()=>({nodes:document.querySelectorAll('#tree .tnode').length,qa:window.LIVELY_QA.run(),ui:!!window.LIVELY}));
 if(core.nodes<1)throw Error('Create-rect did not add hierarchy node');
 if(!core.ui)throw Error('LIVELY runtime missing');
 await page.locator('#btn-3d').click();
 await page.waitForFunction(()=>!!window.THREE&&!!window.THREE.GLTFLoader,{timeout:20000});
 await page.waitForFunction(()=>!!document.querySelector('#app3d'),{timeout:10000});
 const result=await page.evaluate(()=>({vendor:!!(window.THREE&&window.THREE.GLTFLoader),live:!!window.LIVELY,scene:typeof window.__arxe3dSerialize==='function'}));
 if(!result.vendor||!result.live||!result.scene)throw Error('3D integration incomplete '+JSON.stringify(result));
 if(errors.length)throw Error('Browser errors: '+errors.join(' | '));
 console.log('PASS browser smoke: boot, 2D create, 3D library, LIVELY runtime',JSON.stringify(result));
}catch(err){console.error('FAIL browser smoke',err,errors);await page.screenshot({path:'lively-smoke-failed.png',fullPage:true}).catch(()=>{});process.exitCode=1}
finally{await browser.close();await new Promise(ok=>server.close(ok))}
