import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/components/Analytics.tsx', import.meta.url), 'utf8');
const bootstrap = source.match(/analyticsWindow\.gtag = function gtag\([^)]*\) \{([\s\S]*?)\n\s*\};/);
assert.ok(bootstrap, 'GA command bootstrap must exist');
const analyticsWindow = { dataLayer: [] };
vm.runInNewContext(`analyticsWindow.gtag = function () {${bootstrap[1]}};`, { analyticsWindow });
analyticsWindow.gtag('config', 'G-TEST');
const command = analyticsWindow.dataLayer[0];
assert.equal(Object.prototype.toString.call(command), '[object Arguments]');
assert.equal(command[0], 'config');
assert.equal(command[1], 'G-TEST');
console.log('GA bootstrap regression check passed');
