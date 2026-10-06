import assert from 'node:assert/strict';
import { test } from 'node:test';
import contactSubmit from '../netlify/functions/contact-submit.ts';

test('server conversion fires only after accepted non-spam submission and contains attribution, not contact PII', async () => {
    const originalFetch = globalThis.fetch;
    const originalNetlify = globalThis.Netlify;
    globalThis.Netlify = { env: { get: (name) => ({ GA4_MEASUREMENT_ID: 'G-TEST123456', GA4_MEASUREMENT_PROTOCOL_SECRET: 'local-test-secret' })[name] } };
    const deliveries = [];
    let formsStatus = 200;
    globalThis.fetch = async (url, options) => {
        if (String(url).startsWith('https://www.google-analytics.com/')) {
            deliveries.push(JSON.parse(options.body));
            return new Response(null, { status: 204 });
        }
        return new Response('ok', { status: formsStatus });
    };
    const submit = (extra = {}) => contactSubmit(new Request('https://local-test.invalid/api/contact-submit', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ 'form-name': 'contact-form', name: 'Local Test', email: 'test@example.com', firm: 'Example Broker-Dealer', service_interest: 'FOCUS reporting or net capital', message: 'Private test message', 'ga-client-id': '123.456', 'ga-session-id': '123456', 'ga-source': 'google.com', 'ga-medium': 'organic', 'ga-landing-page': '/how-to-prepare-broker-dealer-focus-report/', ...extra })
    }), { requestId: 'local-test-request' });
    try {
        assert.deepEqual(await (await submit()).json(), { ok: true, analyticsTracked: true });
        assert.equal(deliveries.length, 1);
        assert.equal((await (await submit({ 'ga-traffic-type': 'internal' })).json()).analyticsTracked, false);
        assert.equal((await (await submit({ 'ga-client-id': '', 'ga-session-id': '' })).json()).analyticsTracked, false);
        assert.equal(deliveries.length, 1);
        const previewRequest = new Request('https://preview.invalid/api/contact-submit', {
            method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ 'form-name': 'contact-form', 'ga-client-id': '123.456', 'ga-session-id': '123456' })
        });
        assert.equal((await (await contactSubmit(previewRequest, { requestId: 'preview-test', deploy: { context: 'deploy-preview' } })).json()).analyticsTracked, false);
        assert.equal(deliveries.length, 1);
        assert.equal(deliveries[0].client_id, '123.456');
        assert.equal(deliveries[0].events[0].name, 'generate_lead');
        assert.equal(deliveries[0].events[0].params.medium, 'organic');
        assert.equal(deliveries[0].events[0].params.session_id, '123456');
        assert.equal(deliveries[0].events[0].params.landing_page, '/how-to-prepare-broker-dealer-focus-report/');
        assert.equal(deliveries[0].events[0].params.service_interest, 'FOCUS reporting or net capital');
        assert.equal(deliveries[0].events[0].params.firm_provided, true);
        assert.ok(!JSON.stringify(deliveries).includes('test@example.com'));
        assert.ok(!JSON.stringify(deliveries).includes('Example Broker-Dealer'));
        assert.ok(!JSON.stringify(deliveries).includes('Private test message'));
        assert.equal((await (await submit({ 'bot-field': 'spam' })).json()).analyticsTracked, false);
        assert.equal(deliveries.length, 1);
        formsStatus = 502;
        assert.equal((await submit()).status, 502);
        assert.equal(deliveries.length, 1);
        assert.equal((await submit({ 'form-name': 'invalid' })).status, 400);
        assert.equal(deliveries.length, 1);
    } finally {
        globalThis.fetch = originalFetch;
        globalThis.Netlify = originalNetlify;
    }
});
