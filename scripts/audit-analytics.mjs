import { chromium, firefox, webkit } from '@playwright/test';

// Inspect the real tag library while intercepting every analytics collection
// request and form POST. This audit cannot create live traffic or leads.
const engine = process.env.ANALYTICS_AUDIT_BROWSER || 'chromium';
const browser = await ({ chromium, firefox, webkit }[engine]).launch();
const context = await browser.newContext();
const collected = [];
let submission;
await context.route(/https:\/\/[^/]*google-analytics\.com\/.*/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const parameters = new URLSearchParams(url.search);
    const events = (request.postData() || '').split(/\r?\n/);
    for (const event of events) {
        const body = new URLSearchParams(event);
        collected.push({
        event: parameters.get('en') || body.get('en'),
        session: parameters.has('sid') || body.has('sid'),
        engagement: parameters.get('_et') || body.get('_et'),
        campaign: parameters.get('cn') || body.get('cn'),
        medium: parameters.get('cm') || body.get('cm'),
        source: parameters.get('cs') || body.get('cs')
        });
    }
    await route.fulfill({ status: 204 });
});
await context.route('**/api/contact-submit', async (route) => {
    submission = Object.fromEntries(new URLSearchParams(route.request().postData()));
    await route.fulfill({ contentType: 'application/json', body: '{"ok":true,"analyticsTracked":true}' });
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push({ name: error.name, message: error.message, stack: error.stack?.slice(0, 600) }));
try {
    const base = process.env.ANALYTICS_AUDIT_URL || 'https://eiriknordgaard.com';
    await page.goto(`${base}/?utm_source=linkedin&utm_medium=organic_social&utm_campaign=local_audit`);
    await page.getByRole('heading', { level: 1 }).first().waitFor();
    await page.waitForTimeout(14000);
    await page.getByRole('link', { name: /Contact/i }).first().click();
    await page.getByLabel('Full name').fill('Local Analytics Audit');
    await page.getByLabel('Work email').fill('local-audit@example.invalid');
    await page.getByLabel('What do you need help with?').selectOption('Other or not sure');
    await page.getByLabel('How can I help?').fill('Intercepted locally. No submission is delivered.');
    await page.getByRole('button', { name: 'Send Confidential Message' }).click();
    await page.getByText('Thank you. Your message has been sent.').waitFor();
    await page.waitForTimeout(1500);
    await page.goto(`${base}/fractional-finop/`);
    await page.waitForTimeout(1500);
    await page.goto('about:blank');
    console.log(JSON.stringify({ engine, errors, collected, submission: submission && {
        hasClientId: Boolean(submission['ga-client-id']),
        hasSessionId: Boolean(submission['ga-session-id']),
        source: submission['ga-source'], medium: submission['ga-medium'], campaign: submission['ga-campaign'],
        trafficType: submission['ga-traffic-type']
    } }, null, 2));
} finally {
    await browser.close();
}
