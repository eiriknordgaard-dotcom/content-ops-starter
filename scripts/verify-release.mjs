import { spawnSync } from 'node:child_process';

if (!process.env.npm_execpath) throw new Error('Run this through npm run verify:release');
const env = { ...process.env, NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-TEST123456', NEXT_TELEMETRY_DISABLED: '1' };
let failed = false;
for (const script of ['check', 'build', 'test:e2e', 'audit:lighthouse', 'audit:performance-budget']) {
    const result = spawnSync(process.execPath, [process.env.npm_execpath, 'run', script], { env, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        // Source/build failures cannot produce a valid preview. Once built,
        // collect both browser and performance evidence even if either gate fails.
        if (['check', 'build'].includes(script)) process.exit(result.status || 1);
        failed = true;
    }
}
if (failed) process.exit(1);
console.log('Local release checks passed. This fake-ID test export is not a production artifact.');
