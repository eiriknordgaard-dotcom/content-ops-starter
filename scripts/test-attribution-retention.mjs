import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, after } from 'node:test';

const directory = await mkdtemp(path.join(tmpdir(), 'finop-retention-'));
const stores = new Map();
const opened = [];
const settings = new Map();
globalThis.__retentionTestStore = (scope, name) => {
    opened.push(`${scope}:${name}`);
    const key = `${scope}:${name}`;
    if (!stores.has(key)) stores.set(key, new FakeStore());
    return stores.get(key);
};
globalThis.Netlify = { env: { get: key => settings.get(key) } };
const liveFetch = globalThis.fetch;
let deliveries = 0;
globalThis.fetch = async () => { deliveries++; return new Response(null, { status: 204 }); };

class FakeStore {
    entries = new Map();
    deletions = [];
    dataReads = 0;
    version = 0;
    async setJSON(key, data, options = {}) { this.entries.set(key, { data, metadata: options.metadata || {}, etag: `v${++this.version}` }); }
    async get(key) { this.dataReads++; return this.entries.get(key)?.data || null; }
    async getMetadata(key) { const e = this.entries.get(key); return e ? { metadata: e.metadata, etag: e.etag } : null; }
    async delete(key) { this.deletions.push(key); this.entries.delete(key); }
    list({ prefix = '', paginate }) {
        const blobs = [...this.entries].filter(([key]) => key.startsWith(prefix)).map(([key, value]) => ({ key, etag: value.etag }));
        if (!paginate) return Promise.resolve({ blobs, directories: [] });
        return (async function* () { for (let i = 0; i < blobs.length; i += 2) yield { blobs: blobs.slice(i, i + 2), directories: [] }; })();
    }
}

const files = ['netlify/lib/retention.ts', 'netlify/functions/analytics-attribution.ts', 'netlify/functions/calendly-webhook.ts', 'netlify/functions/attribution-retention.ts'];
const modules = [];
for (const [index, file] of files.entries()) {
    const outfile = path.join(directory, `${index}.mjs`);
    await build({ entryPoints: [file], outfile, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent', plugins: [{
        name: 'isolated-blob-stores', setup(builder) {
            builder.onResolve({ filter: /^@netlify\/blobs$/ }, () => ({ path: 'blob-mock', namespace: 'mock' }));
            builder.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: `
                export const getStore = ({name}) => globalThis.__retentionTestStore('production', name);
                export const getDeployStore = ({name,deployID}) => globalThis.__retentionTestStore(deployID, name);` }));
        }
    }] });
    modules.push(await import(pathToFileURL(outfile)));
}
const [lib, legacy, webhook, scheduled] = modules;
const now = Date.UTC(2026, 9, 27, 19);
const production = { deploy: { context: 'production', id: 'test-production' }, requestId: 'synthetic-request' };
const preview = { deploy: { context: 'deploy-preview', id: 'test-preview' }, requestId: 'synthetic-request' };
const legacyRequest = (body, options = {}) => new Request('https://example.invalid/api/analytics-attribution', {
    method: 'POST', headers: { origin: 'https://example.invalid', 'content-type': 'application/json', ...options.headers },
    body: typeof body === 'string' ? body : JSON.stringify(body)
});

after(async () => { globalThis.fetch = liveFetch; delete globalThis.__retentionTestStore; delete globalThis.Netlify; await rm(directory, { recursive: true, force: true }); });

test('expiry boundaries, future dates, and malformed metadata never guess an age', () => {
    assert.equal(lib.knownExpiration(lib.expirationMetadata(now, lib.TOKEN_TTL), lib.TOKEN_TTL, now), now + lib.TOKEN_TTL);
    assert.equal(lib.knownExpiration(lib.expirationMetadata(now + 1, lib.TOKEN_TTL), lib.TOKEN_TTL, now), null);
    assert.equal(lib.knownExpiration({ retentionVersion: 1, createdAt: now, expiresAt: Infinity }, lib.TOKEN_TTL, now), null);
});

test('cleanup paginates, respects exact TTL, and never downloads attribution values', async () => {
    const store = new FakeStore(), observations = new FakeStore();
    for (let i = 0; i < 5; i++) await store.setJSON(`session/${i}`, { private: 'never-read' }, { metadata: lib.expirationMetadata(now - lib.TOKEN_TTL + i, lib.TOKEN_TTL) });
    const report = await lib.cleanStore(store, observations, 'tokens', 'session/', lib.TOKEN_TTL, now, true);
    assert.equal(report.scanned, 5); assert.equal(report.deleted, 1); assert.equal(store.dataReads, 0);
    assert.deepEqual(store.deletions, ['session/0']);
});

test('legacy blobs receive a full unchanged grace period without reading their contents', async () => {
    const store = new FakeStore(), observations = new FakeStore();
    await store.setJSON('session/old', { private: 'never-read' });
    await lib.cleanStore(store, observations, 'tokens', 'session/', lib.TOKEN_TTL, now, true);
    assert.equal(store.entries.size, 1);
    assert.equal((await lib.cleanStore(store, observations, 'tokens', 'session/', lib.TOKEN_TTL, now + lib.TOKEN_TTL - 1, true)).deleted, 0);
    assert.equal((await lib.cleanStore(store, observations, 'tokens', 'session/', lib.TOKEN_TTL, now + lib.TOKEN_TTL, true)).deleted, 1);
    assert.equal(store.dataReads, 0);
    assert.equal(observations.entries.size, 0);
});

test('an updated legacy blob restarts its grace period', async () => {
    const store = new FakeStore(), observations = new FakeStore();
    await store.setJSON('session/old', {});
    await lib.cleanStore(store, observations, 'tokens', 'session/', lib.TOKEN_TTL, now, true);
    await store.setJSON('session/old', {});
    const report = await lib.cleanStore(store, observations, 'tokens', 'session/', lib.TOKEN_TTL, now + lib.TOKEN_TTL, true);
    assert.equal(report.deleted, 0); assert.equal(report.unknown, 1);
});

test('report mode changes no records, including legacy observation markers', async () => {
    const store = new FakeStore(), observations = new FakeStore();
    await store.setJSON('session/old', {});
    await store.setJSON('session/expired', {}, { metadata: lib.expirationMetadata(now - lib.TOKEN_TTL, lib.TOKEN_TTL) });
    const report = await lib.cleanStore(store, observations, 'tokens', 'session/', lib.TOKEN_TTL, now, false);
    assert.equal(report.expired, 1); assert.equal(report.deleted, 0); assert.equal(store.entries.size, 2); assert.equal(observations.entries.size, 0);
    assert.ok(!JSON.stringify(report).includes('session/'));
});

test('duplicate-event markers use 30 days instead of the token TTL', async () => {
    const store = new FakeStore(), observations = new FakeStore();
    await store.setJSON('invitee-created/old', {}, { metadata: lib.expirationMetadata(now - lib.MARKER_TTL, lib.MARKER_TTL) });
    await store.setJSON('invitee-created/recent', {}, { metadata: lib.expirationMetadata(now - lib.TOKEN_TTL, lib.MARKER_TTL) });
    assert.equal((await lib.cleanStore(store, observations, 'markers', 'invitee-created/', lib.MARKER_TTL, now, true)).deleted, 1);
    assert.deepEqual(store.deletions, ['invitee-created/old']);
});

test('unknown deployment context cannot open production storage', () => {
    assert.throws(() => lib.retentionStore({}, 'analytics-attribution'), /context required/);
    opened.length = 0;
    lib.retentionStore(preview, 'analytics-attribution');
    assert.deepEqual(opened, ['test-preview:analytics-attribution']);
});

test('a storage failure is counted without leaking keys or raw exception details', async () => {
    const store = new FakeStore(), observations = new FakeStore();
    await store.setJSON('session/private-key', {});
    store.getMetadata = async () => { throw new Error('private-body-or-secret'); };
    const report = await lib.cleanStore(store, observations, 'tokens', 'session/', lib.TOKEN_TTL, now, true);
    assert.equal(report.errors, 1); assert.equal(report.deleted, 0);
    assert.ok(!JSON.stringify(report).includes('private'));
});

test('a record changed immediately before deletion is retained', async () => {
    const store = new FakeStore(), observations = new FakeStore();
    await store.setJSON('session/changing', {}, { metadata: lib.expirationMetadata(now - lib.TOKEN_TTL, lib.TOKEN_TTL) });
    const read = store.getMetadata.bind(store);
    let calls = 0;
    store.getMetadata = async key => { const result = await read(key); return ++calls === 2 ? { ...result, etag: 'new-version' } : result; };
    const report = await lib.cleanStore(store, observations, 'tokens', 'session/', lib.TOKEN_TTL, now, true);
    assert.equal(report.changed, 1); assert.equal(report.deleted, 0);
});

test('legacy endpoint rejects origin abuse, oversized bodies, and malformed JSON before storing', async () => {
    const before = opened.length;
    assert.equal((await legacy.default(legacyRequest({}, { headers: { origin: 'https://other.invalid' } }), preview)).status, 403);
    assert.equal((await legacy.default(legacyRequest('x'.repeat(8193)), preview)).status, 413);
    for (const value of ['null', '[]', '{']) assert.equal((await legacy.default(legacyRequest(value), preview)).status, 400);
    assert.equal(opened.length, before);
});

test('legacy writes retain only bounded fields, query-free paths, and 24-hour metadata', async () => {
    const response = await legacy.default(legacyRequest({ clientId: '123.456', sessionId: '789', source: 'search', campaign: 'someone@example.invalid', landingPage: '/fractional-finop/?email=private', ignored: 'private' }), preview);
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
    const { token } = await response.json();
    const entry = stores.get('test-preview:analytics-attribution').entries.get(`session/${token}`);
    assert.equal(entry.data.campaign, '(not set)'); assert.equal(entry.data.landingPage, '/fractional-finop/');
    assert.equal(entry.data.ignored, undefined); assert.equal(entry.metadata.expiresAt - entry.metadata.createdAt, lib.TOKEN_TTL);
    assert.deepEqual(legacy.config.rateLimit, { action: 'rate_limit', aggregateBy: ['ip', 'domain'], windowSize: 60, windowLimit: 20 });
});

async function signedRequest(payload) {
    const body = JSON.stringify({ event: 'invitee.created', payload });
    const timestamp = Math.floor(Date.now() / 1000);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('synthetic-signing-key'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${body}`)));
    const signature = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return new Request('https://example.invalid/api/calendly-webhook', { method: 'POST', headers: { 'calendly-webhook-signature': `t=${timestamp},v1=${signature}` }, body });
}

test('preview webhook never delivers an analytics event or opens a production store', async () => {
    settings.set('CALENDLY_WEBHOOK_SIGNING_KEY', 'synthetic-signing-key'); settings.set('GA4_MEASUREMENT_ID', 'G-TEST123456'); settings.set('GA4_MEASUREMENT_PROTOCOL_SECRET', 'synthetic-test-only');
    deliveries = 0; opened.length = 0;
    const response = await webhook.default(await signedRequest({ uri: 'https://example.invalid/test-booking' }), preview);
    assert.equal((await response.json()).excluded, 'preview'); assert.equal(deliveries, 0); assert.equal(opened.length, 0);
});

test('successful mocked webhook stamps expiry and suppresses a duplicate without another delivery', async () => {
    deliveries = 0;
    const payload = { uri: 'https://example.invalid/test-booking' };
    assert.equal((await webhook.default(await signedRequest(payload), production)).status, 200);
    assert.equal(deliveries, 1);
    const response = await webhook.default(await signedRequest(payload), production);
    assert.equal((await response.json()).duplicate, true); assert.equal(deliveries, 1);
    const [entry] = stores.get('production:calendly-webhook-events').entries.values();
    assert.equal(entry.metadata.expiresAt - entry.metadata.createdAt, lib.MARKER_TTL);
});

test('used attribution token is deleted only after a successful mocked delivery', async () => {
    const token = '00000000-0000-4000-8000-000000000000';
    const tokenStore = globalThis.__retentionTestStore('production', 'analytics-attribution');
    await tokenStore.setJSON(`session/${token}`, { clientId: '123.456', sessionId: '789', source: 'search', medium: 'organic', campaign: 'test', landingPage: '/?private=value', createdAt: new Date().toISOString() });
    const payload = { uri: 'https://example.invalid/attributed-test-booking', tracking: { utm_content: `ga_${token}` } };
    const response = await webhook.default(await signedRequest(payload), production);
    assert.equal(response.status, 200); assert.ok(!tokenStore.entries.has(`session/${token}`));
});

test('failed delivery keeps its token and never logs a secret-bearing fetch exception', async () => {
    const token = '00000000-0000-4000-8000-000000000001';
    const tokenStore = globalThis.__retentionTestStore('production', 'analytics-attribution');
    await tokenStore.setJSON(`session/${token}`, { clientId: '123.456', sessionId: '789', createdAt: new Date().toISOString() });
    const previousFetch = globalThis.fetch, previousError = console.error, logs = [];
    try {
        globalThis.fetch = async () => { throw new Error('https://example.invalid/?secret=synthetic-private'); };
        console.error = (...args) => logs.push(args.join(' '));
        const response = await webhook.default(await signedRequest({ uri: 'https://example.invalid/failed-test-booking', tracking: { utm_content: `ga_${token}` } }), production);
        assert.equal(response.status, 502); assert.ok(tokenStore.entries.has(`session/${token}`));
        assert.ok(!logs.join(' ').includes('synthetic-private'));
        assert.ok(!logs.join(' ').includes(token));
    } finally { globalThis.fetch = previousFetch; console.error = previousError; }
});

test('scheduled cleanup defaults off and report mode has no destructive effects', async () => {
    settings.delete('ATTRIBUTION_RETENTION_MODE'); opened.length = 0;
    assert.equal((await scheduled.default(new Request('https://example.invalid'), production)).status, 200); assert.equal(opened.length, 0);
    settings.set('ATTRIBUTION_RETENTION_MODE', 'report');
    const response = await scheduled.default(new Request('https://example.invalid'), preview);
    const report = await response.json();
    assert.equal(report.context, 'preview'); assert.equal(report.tokens.deleted, 0);
    assert.ok(opened.every(key => !key.startsWith('production:')));
    assert.equal(scheduled.config.schedule, '17 * * * *');
});
