import { build } from 'esbuild';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(projectDir, 'netlify', 'functions');
const entryPoints = (await readdir(sourceDir)).filter((name) => name.endsWith('.ts')).map((name) => path.join(sourceDir, name));

// Inline function dependencies before Netlify traces the modern handler.
// This avoids deployment archives that depend on local pnpm symlinks.
await build({
    entryPoints,
    outdir: path.join(projectDir, '.netlify', 'finop-functions-bundled'),
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node24',
    outExtension: { '.js': '.mjs' }
});
console.log(`Bundled ${entryPoints.length} self-contained Netlify functions.`);
