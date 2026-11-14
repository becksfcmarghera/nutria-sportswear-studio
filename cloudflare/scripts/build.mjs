import {build as viteBuild} from 'vite';import {build} from 'esbuild';import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';
const site=JSON.parse(fs.readFileSync('site.json'));fs.rmSync('dist',{recursive:true,force:true});
await viteBuild({configFile:false,root:path.resolve('client'),publicDir:false,build:{outDir:path.resolve('dist/client'),emptyOutDir:true},esbuild:{jsx:'automatic'}});
fs.mkdirSync('dist/public',{recursive:true});fs.cpSync('public','dist/public',{recursive:true});
for(const entry of fs.readdirSync('dist/client')){const dest=entry==='index.html'&&site.slug==='nutria'?'manage.html':entry;fs.cpSync('dist/client/'+entry,'dist/public/'+dest,{recursive:true})}
if(site.slug==='nutria')await build({entryPoints:['studio.js'],outfile:'dist/public/studio.bundle.js',bundle:true,minify:true,format:'esm'});
await build({entryPoints:['server/worker.ts'],outfile:'dist/worker/index.js',bundle:true,minify:true,format:'esm',platform:'neutral',target:'es2022',external:['cloudflare:workers','node:*']});
const code=fs.readFileSync('dist/worker/index.js'),gzip=zlib.gzipSync(code).length;console.log('Worker compresso:',gzip,'byte');if(gzip>3*1024*1024)throw Error('Worker oltre il limite del piano gratuito');
