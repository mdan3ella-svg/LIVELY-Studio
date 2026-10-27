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
const snippets=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].filter(m=>!/(?:^|\s)src\s*=/.test(m[1])).map(m=>m[2]);
if(!snippets.length)fails.push('No inline scripts');
for(let i=0;i<snippets.length;i++){
 const f=join(tmpdir(),`lively-validate-${process.pid}-${i}.js`);
 try {writeFileSync(f,snippets[i]);execFileSync(process.execPath,['--check',f],{stdio:'pipe'});}catch(e){fails.push(`Script ${i+1} syntax invalid: ${String(e.stderr||e.message).slice(0,500)}`)}
 finally {if(existsSync(f))unlinkSync(f)}
}
if(fails.length){console.error('FAILED\n'+fails.join('\n'));process.exit(1)}
console.log(`PASS: HTML entry, application roots, ${snippets.length} inline scripts syntax checked.`);
console.log('NOTE: No browser, imported GLB, or end-to-end production tests run by this script.');
