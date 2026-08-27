import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const steps = [
    ['scripts/generate-sitemap.mjs'],
    ['scripts/check-seo.mjs'],
    ['node_modules/next/dist/bin/next', 'build']
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
