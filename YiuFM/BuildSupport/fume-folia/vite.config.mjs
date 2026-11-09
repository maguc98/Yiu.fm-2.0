import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const here=path.dirname(fileURLToPath(import.meta.url));
const foliaRoot=process.env.FOLIA_ROOT;
const outDir=process.env.FUME_OUT_DIR||path.resolve(here,'../../Resources/Web/APP/fume-folia');
if(!foliaRoot)throw new Error('FOLIA_ROOT is required');
const shellShim=path.resolve(here,'shell-stubs.jsx');
const subtitleShim=path.resolve(here,'subtitle-stub.jsx');
export default defineConfig({
 root:here,base:'./',
 plugins:[react(),{name:'yiufm-folia-fume-host-boundaries',enforce:'pre',resolveId(source,importer){if(importer&&importer.startsWith(foliaRoot)){if(source==='../VisualizerSubtitleOverlay')return subtitleShim;if(source==='../VisualizerShell'||source==='../styleTransition/firstFrame'||source==='../preview/frozenPicture')return shellShim;}return null;}}],
 resolve:{alias:{'@folia':foliaRoot}},
 build:{target:'safari16',outDir,emptyOutDir:true,sourcemap:false,minify:'esbuild',
  lib:{entry:path.resolve(here,'entry.jsx'),name:'YiuFoliaFume',formats:['iife'],fileName:()=>'fume-folia.js'},
  rollupOptions:{output:{inlineDynamicImports:true,assetFileNames:'fume-folia-[name][extname]'}}
 }
});
