import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ALERT_TITLE, handleMonitorAlert } = require('./production-monitor-alert.cjs');

function createHarness(openIssues = []) {
    const calls = [];
    const github = {
        rest: {
            issues: {
                listForRepo: async (input) => {
                    calls.push(['listForRepo', input]);
                    return { data: openIssues };
                },
                create: async (input) => {
                    calls.push(['create', input]);
                    return { data: { number: 42 } };
                },
                createComment: async (input) => {
                    calls.push(['createComment', input]);
                    return { data: {} };
                },
                update: async (input) => {
                    calls.push(['update', input]);
                    return { data: {} };
                }
            }
        }
    };

    return { calls, github };
}

const context = { repo: { owner: 'eiriknordgaard-dotcom', repo: 'content-ops-starter' } };
const runUrl = 'https://github.com/eiriknordgaard-dotcom/content-ops-starter/actions/runs/123';

{
    const harness = createHarness();
    const result = await handleMonitorAlert({ github: harness.github, context, outcome: 'failure', runUrl });
    assert.deepEqual(result, { action: 'opened', issueNumber: 42 });
    assert.equal(harness.calls[1][0], 'create');
    assert.equal(harness.calls[1][1].title, ALERT_TITLE);
    assert.deepEqual(harness.calls[1][1].assignees, ['eiriknordgaard-dotcom']);
}

{
    const harness = createHarness([{ number: 7, title: ALERT_TITLE }]);
    const result = await handleMonitorAlert({ github: harness.github, context, outcome: 'failure', runUrl });
    assert.deepEqual(result, { action: 'updated', issueNumber: 7 });
    assert.equal(harness.calls[1][0], 'createComment');
}

{
    const harness = createHarness([{ number: 9, title: ALERT_TITLE }]);
    const result = await handleMonitorAlert({ github: harness.github, context, outcome: 'success', runUrl });
    assert.deepEqual(result, { action: 'closed', issueNumber: 9 });
    assert.equal(harness.calls[1][0], 'createComment');
    assert.equal(harness.calls[2][0], 'update');
    assert.equal(harness.calls[2][1].state, 'closed');
}

{
    const harness = createHarness();
    const result = await handleMonitorAlert({ github: harness.github, context, outcome: 'success', runUrl });
    assert.deepEqual(result, { action: 'none' });
    assert.equal(harness.calls.length, 1);
}

console.log('Production monitor alert tests passed');
