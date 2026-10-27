import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

function run(failScript) {
    const directory = mkdtempSync(join(tmpdir(), 'finop-release-runner-'));
    try {
        const stub = join(directory, 'npm.mjs');
        const log = join(directory, 'calls.jsonl');
        writeFileSync(stub, `import { appendFileSync } from 'node:fs';
const script = process.argv[3];
appendFileSync(process.env.RELEASE_TEST_LOG, JSON.stringify({ script, id: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, telemetry: process.env.NEXT_TELEMETRY_DISABLED }) + '\\n');
process.exit(script === process.env.RELEASE_TEST_FAIL ? 1 : 0);`);
        const result = spawnSync(process.execPath, [new URL('./verify-release.mjs', import.meta.url).pathname], {
            env: { ...process.env, npm_execpath: stub, RELEASE_TEST_LOG: log, RELEASE_TEST_FAIL: failScript,
                NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-REAL-MUST-NOT-PASS-THROUGH' },
            encoding: 'utf8'
        });
        return { status: result.status, calls: readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line)) };
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
}

test('browser failures retain a failing result while still collecting performance evidence', () => {
    const result = run('test:e2e');
    assert.equal(result.status, 1);
    assert.deepEqual(result.calls.map(call => call.script), ['check', 'build', 'test:e2e', 'audit:lighthouse', 'audit:performance-budget']);
    assert.ok(result.calls.every(call => call.id === 'G-TEST123456' && call.telemetry === '1'));
});

test('build failure stops before a stale export can be tested', () => {
    const result = run('build');
    assert.equal(result.status, 1);
    assert.deepEqual(result.calls.map(call => call.script), ['check', 'build']);
});

test('a Lighthouse gate failure fails the combined release check', () => {
    assert.equal(run('audit:lighthouse').status, 1);
    assert.equal(run('audit:performance-budget').status, 1);
    assert.equal(run('').status, 0);
});
