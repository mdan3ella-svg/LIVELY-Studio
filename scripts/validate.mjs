import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFileSync, unlinkSync } from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
let fails=[];
if(!/^<!doctype html>/i.test(html.trimStart()))fails.push('Missing HTML5 DOCTYPE');
if(!html.includes('id="app"'))fails.push('Missing application root');
if(!html.includes('id="arxe-runtime"'))fails.push('Missing original APXH runtime');
if(!html.includes('LIVELY'))fails.push('Missing LIVELY integration');
if(!html.includes('window.LIVELY_QA'))fails.push('Missing runtime diagnostics');
if(html.includes('id="logo">GAME'))fails.push('Legacy branding in global header');
if(/https:\/\/(?:cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)\/.*three/i.test(html))fails.push('CDN Three.js dependency remains');
if(!html.includes("'./vendor/three.min.js'"))fails.push('3D loader does not use local vendor');
for(const f of ['vendor/three.min.js','vendor/GLTFLoader.js']){if(!existsSync(new URL('../'+f,import.meta.url)))fails.push('Missing vendored file: '+f)}
if(!html.includes('window.__livelyBootState'))fails.push('Missing boot state tracking');
if(/<\/script>\s*>\s*<!-- APP -->/.test(html))fails.push('Stray markup after boot script');
const snippets=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].filter(m=>!/(?:^|\s)src\s*=/.test(m[1])).map(m=>m[2]);
if(!snippets.length)fails.push('No inline scripts');
for(let i=0;i<snippets.length;i++){
 const f=join(tmpdir(),`lively-validate-${process.pid}-${i}.js`);
 try {writeFileSync(f,snippets[i]);execFileSync(process.execPath,['--check',f],{stdio:'pipe'});}catch(e){fails.push(`Script ${i+1} syntax invalid: ${String(e.stderr||e.message).slice(0,500)}`)}
 finally {if(existsSync(f))unlinkSync(f)}
}
if(fails.length){console.error('FAILED\n'+fails.join('\n'));process.exit(1)}
console.log(`PASS: HTML entry, application roots, ${snippets.length} inline scripts syntax checked.`);
console.log('NOTE: Static checks only; browser/GLB/animation round trips require browser tests.');
