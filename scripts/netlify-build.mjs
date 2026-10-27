import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const steps = [
    ['scripts/generate-sitemap.mjs'],
    ['scripts/check-seo.mjs'],
    ['node_modules/next/dist/bin/next', 'build', '--webpack']
];

for (const args of steps) {
    const result = spawnSync(process.execPath, args, {
        cwd: projectDir,
        env: process.env,
        stdio: 'inherit'
    });

    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

// A successful framework exit must still contain the statically rendered page.
// Node 20 produced dialog-only HTML in the hosted build and caused hydration shifts.
for (const route of ['', 'fractional-finop', 'what-does-a-finop-do']) {
    const html = readFileSync(path.join(projectDir, 'out', route, 'index.html'), 'utf8');
    if (!/<main\b/.test(html) || !/<h1\b/.test(html)) {
        throw new Error(`Static page content missing for /${route}. Use the Node version in .nvmrc; do not publish this export.`);
    }
}

const exported404 = path.join(projectDir, 'out', '404', 'index.html');
if (existsSync(exported404)) {
    copyFileSync(exported404, path.join(projectDir, 'out', '404.html'));
}

await import('./bundle-functions.mjs');
