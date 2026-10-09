import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the production attribution logic without opening a browser or
// sending analytics, form submissions, or bookings to any external service.
const compiled = ts.transpileModule(readFileSync(new URL('../src/utils/analytics-attribution.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;

function harness({ url = 'https://eiriknordgaard.com/', referrer = '', blockedStorage = false, identifiers = true } = {}) {
    const session = new Map();
    const local = new Map();
    const storage = (map) => ({
        getItem(key) { if (blockedStorage) throw new Error('Storage blocked'); return map.get(key) || null; },
        setItem(key, value) { if (blockedStorage) throw new Error('Storage blocked'); map.set(key, value); }
    });
    const window = {
        location: new URL(url),
        sessionStorage: storage(session),
        localStorage: storage(local),
        setTimeout: identifiers ? () => 0 : (callback) => queueMicrotask(callback),
        gtag: identifiers ? (_command, _id, field, callback) => callback(field === 'client_id' ? '123.456' : '1791387300') : undefined
    };
    const context = vm.createContext({ exports: {}, process: { env: { NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-TEST' } }, window, document: { referrer }, URL, Promise });
    vm.runInContext(compiled, context);
    return { get: context.exports.getAnalyticsAttribution, window, local };
}

test('organic entry source and landing page survive navigation to the contact form', async () => {
    const audit = harness({ url: 'https://eiriknordgaard.com/how-to-prepare-broker-dealer-focus-report/', referrer: 'https://www.google.com/' });
    const first = await audit.get();
    assert.equal(first.source, 'google.com');
    assert.equal(first.medium, 'organic');
    assert.equal(first.clientId, '123.456');
    assert.equal(first.sessionId, '1791387300');
    audit.window.location = new URL('https://eiriknordgaard.com/#contact');
    const next = await audit.get();
    assert.equal(next.landingPage, '/how-to-prepare-broker-dealer-focus-report/');
    assert.equal(next.medium, 'organic');
});

test('campaign links retain source, medium, and campaign', async () => {
    const result = await harness({ url: 'https://eiriknordgaard.com/fractional-finop/?utm_source=linkedin&utm_medium=organic_social&utm_campaign=finop_consulting' }).get();
    assert.equal(result.source, 'linkedin');
    assert.equal(result.medium, 'organic_social');
    assert.equal(result.campaign, 'finop_consulting');
    assert.equal(result.landingPage, '/fractional-finop/');
});

test('direct and professional referral visits are distinguishable', async () => {
    const direct = await harness().get();
    assert.equal(direct.source, '(direct)');
    assert.equal(direct.medium, '(none)');
    const referral = await harness({ referrer: 'https://www.example.com/resources/' }).get();
    assert.equal(referral.source, 'example.com');
    assert.equal(referral.medium, 'referral');
});

test('blocked storage and absent GA identifiers do not prevent attribution or invent an analytics user', async () => {
    const result = await harness({ blockedStorage: true, identifiers: false, referrer: 'https://www.bing.com/' }).get();
    assert.equal(result.source, 'bing.com');
    assert.equal(result.medium, 'organic');
    assert.equal(result.clientId, undefined);
    assert.equal(result.sessionId, undefined);
});

test('internal testing is flagged for server conversion exclusion', async () => {
    const audit = harness();
    audit.local.set('ga_internal_traffic', 'true');
    assert.equal((await audit.get()).trafficType, 'internal');
});
