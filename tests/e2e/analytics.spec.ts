import { expect, test } from '@playwright/test';

test('organic guide visitors carry attribution into Calendly without counting a booking click as a completion', async ({ page }) => {
    // Serve the local export under the production hostname. All analytics and
    // booking requests are intercepted, so no real events or appointments occur.
    await page.route('https://eiriknordgaard.com/**', async (route) => {
        const url = new URL(route.request().url());
        const response = await route.fetch({ url: `http://127.0.0.1:4173${url.pathname}${url.search}` });
        await route.fulfill({ response });
    });
    await page.route('https://www.googletagmanager.com/**', (route) => route.fulfill({
        contentType: 'application/javascript',
        body: `window.gtag = function(...args) {
            window.dataLayer.push(args);
            if (args[0] === 'get') args[3](args[2] === 'client_id' ? '123456789.987654321' : '1757000000');
        };`
    }));
    let attribution: Record<string, unknown> = {};
    await page.route('https://eiriknordgaard.com/api/analytics-attribution', async (route) => {
        attribution = route.request().postDataJSON();
        await route.fulfill({ contentType: 'application/json', body: '{"ok":true,"token":"12345678-1234-4123-8123-123456789012"}' });
    });
    await page.context().route('https://calendly.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<h1>Local booking destination</h1>' }));
    await page.goto('https://eiriknordgaard.com/how-to-prepare-broker-dealer-focus-report/', { referer: 'https://www.google.com/' });
    await expect(page.locator('#google-analytics-loader')).toBeAttached();
    await page.getByRole('link', { name: 'Explore FOCUS Reporting Support', exact: true }).first().click();
    await expect(page).toHaveURL('https://eiriknordgaard.com/focus-reporting-net-capital-support/');
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'Schedule a Confidential Call', exact: true }).click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(/utm_content=ga_12345678-1234-4123-8123-123456789012/);
    expect(attribution).toMatchObject({ clientId: '123456789.987654321', sessionId: '1757000000', source: 'google.com', medium: 'organic', landingPage: '/how-to-prepare-broker-dealer-focus-report/' });
    const events = await page.evaluate(() => (window as typeof window & { dataLayer?: unknown[][] }).dataLayer || []);
    expect(events.some((event) => event[1] === 'schedule_call_click')).toBe(true);
    expect(events.some((event) => event[1] === 'service_detail_click')).toBe(true);
    expect(events.some((event) => ['schedule_call_complete', 'generate_lead'].includes(String(event[1])))).toBe(false);
});

test('browser exceptions include diagnostic dimensions, redact sensitive text, and deduplicate repeats', async ({ page }) => {
    await page.route('https://eiriknordgaard.com/**', async (route) => {
        const url = new URL(route.request().url());
        const response = await route.fetch({ url: `http://127.0.0.1:4173${url.pathname}${url.search}` });
        await route.fulfill({ response });
    });
    await page.route('https://www.googletagmanager.com/**', (route) => route.fulfill({
        contentType: 'application/javascript',
        body: ''
    }));
    await page.goto('https://eiriknordgaard.com/fractional-finop/');

    await page.evaluate(() => {
        const error = new Error('Request failed for client@example.com at https://private.example.test/path?token=secret');
        const event = new ErrorEvent('error', {
            message: error.message,
            error,
            filename: 'https://eiriknordgaard.com/_next/static/chunks/app.js?token=secret',
            lineno: 42,
            colno: 7
        });
        window.dispatchEvent(event);
        window.dispatchEvent(event);
    });

    const exceptions = await page.evaluate(() => {
        const dataLayer = (window as typeof window & { dataLayer?: unknown[][] }).dataLayer || [];
        return dataLayer.filter((event) => event[0] === 'event' && event[1] === 'exception');
    });
    expect(exceptions).toHaveLength(1);
    expect(exceptions[0][2]).toMatchObject({
        fatal: false,
        error_type: 'runtime_error',
        error_name: 'Error',
        error_source: '/_next/static/chunks/app.js',
        page_path: '/fractional-finop/',
        line_number: 42,
        column_number: 7
    });
    expect(exceptions[0][2]).toHaveProperty('error_id');
    expect(String((exceptions[0][2] as { description: string }).description)).toContain('[email]');
    expect(String((exceptions[0][2] as { description: string }).description)).toContain('[url]');
    expect(JSON.stringify(exceptions[0][2])).not.toContain('secret');
});

test('organic attribution survives subsequent direct navigation', async ({ page }) => {
    let submittedBody = '';
    await page.route('**/api/contact-submit', async (route) => {
        submittedBody = route.request().postData() || '';
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    await page.goto('/#contact', { referer: 'https://www.google.com/' });
    await page.getByLabel('Full name').fill('Organic Attribution Test');
    await page.getByLabel('Work email').fill('organic-test@example.com');
    await page.getByLabel('What do you need help with?').selectOption('Ongoing outsourced FINOP');
    await page.getByLabel('How can I help?').fill('Local-only attribution verification');
    await page.getByRole('button', { name: 'Send Confidential Message' }).click();
    await expect(page.getByText('Thank you. Your message has been sent.')).toBeVisible();
    const parameters = new URLSearchParams(submittedBody);
    expect(parameters.get('ga-source')).toBe('google.com');
    expect(parameters.get('ga-medium')).toBe('organic');
    await page.goto('/how-to-prepare-broker-dealer-focus-report/');
    await page.goto('/#contact');
    await page.getByLabel('Full name').fill('Returning Organic Test');
    await page.getByLabel('Work email').fill('organic-test@example.com');
    await page.getByLabel('What do you need help with?').selectOption('Ongoing outsourced FINOP');
    await page.getByLabel('How can I help?').fill('Verify original acquisition is retained');
    await page.getByRole('button', { name: 'Send Confidential Message' }).click();
    await expect(page.getByText('Thank you. Your message has been sent.')).toBeVisible();
    const retained = new URLSearchParams(submittedBody);
    expect(retained.get('ga-source')).toBe('google.com');
    expect(retained.get('ga-medium')).toBe('organic');
    expect(retained.get('ga-landing-page')).toBe('/');
});

test('failed contact submissions do not report a successful conversion', async ({ page }) => {
    await page.addInitScript(() => {
        const analyticsWindow = window as typeof window & { __analyticsTestEvents?: unknown[][]; gtag?: (...args: unknown[]) => void };
        analyticsWindow.__analyticsTestEvents = [];
        analyticsWindow.gtag = (...args: unknown[]) => analyticsWindow.__analyticsTestEvents?.push(args);
    });
    await page.route('**/api/contact-submit', (route) => route.fulfill({ status: 502, body: '{"ok":false}' }));
    await page.goto('/#contact');
    await page.getByLabel('Full name').fill('Failed Submission Test');
    await page.getByLabel('Work email').fill('failure-test@example.com');
    await page.getByLabel('What do you need help with?').selectOption('Other or not sure');
    await page.getByLabel('How can I help?').fill('Local-only failure verification');
    await page.getByRole('button', { name: 'Send Confidential Message' }).click();
    await expect(page.getByText('Something went wrong. Please email me directly or try again.')).toBeVisible();
    const events = await page.evaluate(() => (window as typeof window & { __analyticsTestEvents?: unknown[][] }).__analyticsTestEvents || []);
    expect(events.some((event) => ['contact_form_submit', 'generate_lead'].includes(String(event[1])))).toBe(false);
    expect(events).toContainEqual(['event', 'contact_form_error', { form_name: 'contact-form', error_type: 'submission_failed' }]);
});

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
    await page.getByLabel('Firm name (optional)').fill('Example Broker-Dealer');
    await page.getByLabel('What do you need help with?').selectOption('FOCUS reporting or net capital');
    await page.getByLabel('How can I help?').fill('Verify the qualified lead event');
    await page.getByRole('button', { name: 'Send Confidential Message' }).click();

    await expect(page.getByText('Thank you. Your message has been sent.')).toBeVisible();
    const events = await page.evaluate(() => {
        const analyticsWindow = window as typeof window & { __analyticsTestEvents?: unknown[][] };
        return analyticsWindow.__analyticsTestEvents || [];
    });

    expect(events).toContainEqual([
        'event',
        'contact_form_submit',
        { form_name: 'contact-form', service_interest: 'FOCUS reporting or net capital' }
    ]);
    expect(events.some((event) => event[0] === 'event' && event[1] === 'generate_lead')).toBe(false);

    const parameters = new URLSearchParams(submittedBody);
    expect(parameters.get('form-name')).toBe('contact-form');
    expect(parameters.get('ga-client-id')).toBe('123456789.987654321');
    expect(parameters.get('ga-session-id')).toBe('1757000000');
    expect(parameters.get('ga-source')).toBe('linkedin');
    expect(parameters.get('ga-medium')).toBe('social');
    expect(parameters.get('ga-campaign')).toBe('finop_advice');
    expect(parameters.get('ga-landing-page')).toBe('/');
    expect(parameters.get('service_interest')).toBe('FOCUS reporting or net capital');
    expect(parameters.get('firm')).toBe('Example Broker-Dealer');
});

test('audit checklist downloads directly and records the resource event', async ({ page }) => {
    await page.addInitScript(() => {
        const analyticsWindow = window as typeof window & {
            __analyticsTestEvents?: unknown[][];
            gtag?: (...args: unknown[]) => void;
        };
        analyticsWindow.__analyticsTestEvents = [];
        analyticsWindow.gtag = (...args: unknown[]) => {
            analyticsWindow.__analyticsTestEvents?.push(args);
        };
    });

    await page.goto('/finop-audit-readiness-checklist/');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download the Checklist', exact: true }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('finop-audit-readiness-checklist.pdf');
    const events = await page.evaluate(() => {
        const analyticsWindow = window as typeof window & { __analyticsTestEvents?: unknown[][] };
        return analyticsWindow.__analyticsTestEvents || [];
    });
    expect(events).toContainEqual([
        'event',
        'resource_download',
        {
            resource: 'finop_audit_readiness_checklist',
            file_name: 'finop-audit-readiness-checklist.pdf'
        }
    ]);
});
