#!/usr/bin/env node
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = resolve(__dirname, '..');
const entryPoint = resolve(projectRoot, 'src/Online3DViewer.BlazorApp/wwwroot/js/blazorInterop.ts');
const outFile = resolve(projectRoot, 'src/Online3DViewer.BlazorApp/wwwroot/js/blazorInterop.js');

await build({
    entryPoints: [entryPoint],
    outfile: outFile,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    sourcemap: true,
    target: ['es2022'],
    external: ['../lib/o3dv/*'],
});

console.log('Blazor interop bundle generated at', outFile);
