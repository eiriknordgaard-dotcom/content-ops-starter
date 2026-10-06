import { execFileSync } from 'node:child_process';
import contactSubmit from '../netlify/functions/contact-submit.ts';

// Google's debug endpoint validates the real handler payload without recording
// an event. Credentials are held in memory and never written or printed.
const cli = process.env.NETLIFY_CLI_PATH;
if (!cli) throw new Error('Set NETLIFY_CLI_PATH to the authenticated Netlify CLI entry point.');
const values = Object.fromEntries(['GA4_MEASUREMENT_ID', 'GA4_MEASUREMENT_PROTOCOL_SECRET'].map((name) => [
    name, execFileSync(process.execPath, [cli, 'env:get', name, '--context', 'production'], { encoding: 'utf8' }).trim()
]));
globalThis.Netlify = { env: { get: (name) => values[name] } };
const originalFetch = globalThis.fetch;
let validation;
globalThis.fetch = async (url, options) => {
    if (String(url).startsWith('https://www.google-analytics.com/mp/collect')) {
        const response = await originalFetch(String(url).replace('/mp/collect', '/debug/mp/collect'), options);
        validation = await response.json();
        return new Response(null, { status: validation.validationMessages?.length ? 400 : 204 });
    }
    return new Response('Intercepted contact form. No submission sent.', { status: 200 });
};
try {
    const response = await contactSubmit(new Request('https://local-validation.invalid/api/contact-submit', {
        method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ 'form-name': 'contact-form', 'ga-client-id': '123.456', 'ga-session-id': String(Math.floor(Date.now() / 1000)), 'ga-source': 'linkedin', 'ga-medium': 'organic_social', 'ga-campaign': 'validation_only', 'ga-landing-page': '/' })
    }), { requestId: 'validation-only', deploy: { context: 'production' } });
    console.log(JSON.stringify({ response: await response.json(), validation }, null, 2));
    if (!validation || validation.validationMessages?.length) process.exitCode = 1;
} finally {
    globalThis.fetch = originalFetch;
    delete globalThis.Netlify;
}
