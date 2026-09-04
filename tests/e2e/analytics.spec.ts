import { expect, test } from '@playwright/test';

test('successful contact form submission uses the server-side conversion endpoint', async ({ page }) => {
    await page.addInitScript(() => {
        const analyticsWindow = window as typeof window & {
            __analyticsMeasurementId?: string;
            __analyticsTestEvents?: unknown[][];
            gtag?: (...args: unknown[]) => void;
        };
        analyticsWindow.__analyticsMeasurementId = 'G-TEST123456';
        analyticsWindow.__analyticsTestEvents = [];
        analyticsWindow.gtag = (...args: unknown[]) => {
            analyticsWindow.__analyticsTestEvents?.push(args);
            if (args[0] === 'get' && args[2] === 'client_id' && typeof args[3] === 'function') {
                (args[3] as (value: string) => void)('123456789.987654321');
            }
            if (args[0] === 'get' && args[2] === 'session_id' && typeof args[3] === 'function') {
                (args[3] as (value: string) => void)('1757000000');
            }
        };
    });

    let submittedBody = '';
    await page.route('**/api/contact-submit', async (route) => {
        submittedBody = route.request().postData() || '';
        await route.fulfill({ status: 200, contentType: 'text/html', body: 'ok' });
    });
    await page.goto('/?utm_source=linkedin&utm_medium=social&utm_campaign=finop_advice#contact');

    await page.getByLabel('Full name').fill('Analytics Test');
    await page.getByLabel('Work email').fill('analytics-test@example.com');
    await page.getByLabel('How can I help?').fill('Verify the qualified lead event');
    await page.getByRole('button', { name: 'Send Confidential Message' }).click();

    await expect(page.getByText('Thank you. Your message has been sent.')).toBeVisible();
    const events = await page.evaluate(() => {
        const analyticsWindow = window as typeof window & { __analyticsTestEvents?: unknown[][] };
        return analyticsWindow.__analyticsTestEvents || [];
    });

    expect(events).toContainEqual(['event', 'contact_form_submit', { form_name: 'contact-form' }]);
    expect(events.some((event) => event[0] === 'event' && event[1] === 'generate_lead')).toBe(false);

    const parameters = new URLSearchParams(submittedBody);
    expect(parameters.get('form-name')).toBe('contact-form');
    expect(parameters.get('ga-client-id')).toBe('123456789.987654321');
    expect(parameters.get('ga-session-id')).toBe('1757000000');
    expect(parameters.get('ga-source')).toBe('linkedin');
    expect(parameters.get('ga-medium')).toBe('social');
    expect(parameters.get('ga-campaign')).toBe('finop_advice');
    expect(parameters.get('ga-landing-page')).toBe('/');
});
