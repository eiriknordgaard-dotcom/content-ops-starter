import { test as base, expect } from '@playwright/test';

export { expect };
export type { Page } from '@playwright/test';

// Individual tests may fulfill mock requests before this final network guard.
// No unhandled request can reach a live conversion or booking service.
export const test = base.extend<{ _networkIsolation: void }>({
    _networkIsolation: [async ({ context, baseURL }, use, testInfo) => {
        const preview = new URL(baseURL!);
        if (!['localhost', '127.0.0.1'].includes(preview.hostname)) throw new Error('A local preview is required');
        const unexpected = new Set<string>();
        const knownOffline = /(^|\.)(google-analytics\.com|googletagmanager\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|netlify-rum\.netlify\.app|ingesteer\.services-prod\.nsvcs\.net)$/;
        await context.route('**/*', async route => {
            const request = route.request(), url = new URL(request.url());
            if (url.origin === preview.origin && ['GET', 'HEAD'].includes(request.method())) {
                await route.continue();
                return;
            }
            if (knownOffline.test(url.hostname)) {
                if (request.resourceType() === 'script') await route.fulfill({ contentType: 'application/javascript', body: '' });
                else await route.abort();
                return;
            }
            unexpected.add(`${request.method()} ${url.origin}${url.pathname}`);
            await route.abort();
        });
        await use();
        if (unexpected.size) await testInfo.attach('blocked-unmocked-requests', {
            body: JSON.stringify([...unexpected], null, 2), contentType: 'application/json'
        });
        expect([...unexpected], 'All business requests must be explicitly mocked; all other traffic stays on the local preview').toEqual([]);
    }, { auto: true }]
});
