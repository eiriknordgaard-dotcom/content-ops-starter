import { expect, test } from '@playwright/test';

test('successful contact form submission uses the server-side conversion endpoint', async ({ page }) => {
    await page.addInitScript(() => {
        const analyticsWindow = window as typeof window & {
            __analyticsTestEvents?: unknown[][];
            gtag?: (...args: unknown[]) => void;
        };
        analyticsWindow.__analyticsTestEvents = [];
        analyticsWindow.gtag = (...args: unknown[]) => analyticsWindow.__analyticsTestEvents?.push(args);
    });

    await page.route('**/api/contact-submit', async (route) => {
        await route.fulfill({ status: 200, contentType: 'text/html', body: 'ok' });
    });
    await page.goto('/#contact');

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
});
