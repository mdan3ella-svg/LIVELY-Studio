import {mkdirSync,copyFileSync,existsSync,statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const version='0.128.0';
const target='vendor';
mkdirSync(target,{recursive:true});
const source='node_modules/three';
if(!existsSync(source+'/build/three.min.js')) {
 console.log('Installing pinned Three.js '+version+' via npm (required once at build time)');
 execFileSync('npm',['install','--no-save','--ignore-scripts','--no-audit','--no-fund','three@'+version],{stdio:'inherit'});
}
const items=[['build/three.min.js','three.min.js'],['examples/js/loaders/GLTFLoader.js','GLTFLoader.js']];
for(const [src,dst] of items){const f=source+'/'+src; if(!existsSync(f))throw Error('Missing '+f);copyFileSync(f,target+'/'+dst);if(statSync(target+'/'+dst).size<2000)throw Error('Vendor file too small '+dst);console.log('Bundled',target+'/'+dst,statSync(target+'/'+dst).size,'bytes')}
