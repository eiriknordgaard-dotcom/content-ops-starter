import { expect, test, type Page } from './fixtures/safe-test';

type Intercepted = { contact: string[]; unexpected: string[] };

async function isolateLeadFlow(page: Page): Promise<Intercepted> {
    const intercepted: Intercepted = { contact: [], unexpected: [] };
    const previewOrigin = new URL(test.info().project.use.baseURL as string);
    if (!['localhost', '127.0.0.1'].includes(previewOrigin.hostname)) {
        throw new Error(`Lead-flow tests require a local preview, received ${previewOrigin.origin}`);
    }
    await page.context().route('**/*', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin === previewOrigin.origin) {
            if (url.pathname === '/api/contact-submit') {
                intercepted.contact.push(request.postData() || '');
                await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
                return;
            }
            if (url.pathname === '/api/analytics-attribution') {
                await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
                return;
            }
            await route.continue();
            return;
        }
        if (url.hostname === 'assets.calendly.com' && url.pathname === '/assets/external/widget.js') {
            await route.fulfill({ contentType: 'application/javascript', body: `window.Calendly = { initInlineWidget({parentElement}) {
                const frame = document.createElement('iframe');
                frame.src = 'https://calendly.com/finop-test-only';
                parentElement.appendChild(frame);
            } };` });
            return;
        }
        if (url.hostname === 'calendly.com' && url.pathname === '/finop-test-only') {
            await route.fulfill({ contentType: 'text/html', body: `<h1>Simulated booking</h1>
                <button onclick="parent.postMessage({event:'calendly.event_scheduled',payload:{event:{uri:'test-only'}}}, '*')">Complete simulated booking</button>` });
            return;
        }
        // Known presentation assets and analytics remain offline during the test.
        if (request.method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com', 'www.googletagmanager.com'].includes(url.hostname)) {
            await route.abort();
            return;
        }
        // Abort and report any other external request, including booking services.
        intercepted.unexpected.push(`${request.method()} ${url.origin}${url.pathname}`);
        await route.abort();
    });
    return intercepted;
}

for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
    test(`${viewport.name} contact entry validates and completes only through the mock`, async ({ page }) => {
        await page.setViewportSize(viewport);
        const intercepted = await isolateLeadFlow(page);
        await page.addInitScript(() => {
            const leadWindow = window as typeof window & { __leadEvents?: unknown[][]; gtag?: (...args: unknown[]) => void };
            leadWindow.__leadEvents = [];
            leadWindow.gtag = (...args: unknown[]) => leadWindow.__leadEvents?.push(args);
        });
        await page.goto('/#contact');
        const submit = page.getByRole('button', { name: 'Send Confidential Message' });

        await test.step('Required fields stop an empty submission', async () => {
            await submit.click();
            expect(intercepted.contact).toHaveLength(0);
            expect(await page.getByLabel('Full name').evaluate((input: HTMLInputElement) => input.validity.valid)).toBe(false);
        });

        await test.step('Invalid email stops a submission', async () => {
            await page.getByLabel('Full name').fill('Local Lead Test');
            await page.getByLabel('Work email').fill('not-an-email');
            await page.getByLabel('What do you need help with?').selectOption('Ongoing outsourced FINOP');
            await page.getByLabel('How can I help?').fill('This is a local-only verification.');
            await submit.click();
            expect(intercepted.contact).toHaveLength(0);
            expect(await page.getByLabel('Work email').evaluate((input: HTMLInputElement) => input.validity.valid)).toBe(false);
        });

        await test.step('Valid form reaches the intercepted endpoint once', async () => {
            await page.getByLabel('Work email').fill('local-only@example.com');
            await submit.click();
            await expect(page.getByText('Thank you. Your message has been sent.')).toBeVisible();
            expect(intercepted.contact).toHaveLength(1);
            const body = new URLSearchParams(intercepted.contact[0]);
            expect(body.get('form-name')).toBe('contact-form');
            expect(body.get('email')).toBe('local-only@example.com');
            const events = await page.evaluate(() => (window as typeof window & { __leadEvents?: unknown[][] }).__leadEvents || []);
            expect(events.filter((event) => event[1] === 'contact_form_submit')).toHaveLength(1);
        });
        expect(intercepted.unexpected).toEqual([]);
    });

    test(`${viewport.name} booking entry supports keyboard, closing, and simulated completion`, async ({ page }) => {
        await page.setViewportSize(viewport);
        const intercepted = await isolateLeadFlow(page);
        await page.goto('/');
        const opener = page.locator('main a[href^="https://calendly.com/"]').first();
        await opener.focus();

        await test.step('Keyboard opens and Escape closes the dialog', async () => {
            await opener.press('Enter');
            await expect(page.getByRole('dialog')).toBeVisible();
            await expect(page.frameLocator('dialog iframe').getByRole('heading', { name: 'Simulated booking' })).toBeVisible();
            await page.keyboard.press('Escape');
            await expect(page.getByRole('dialog')).not.toBeVisible();
            await expect(opener).toBeFocused();
        });

        await test.step('Close button works after reopening', async () => {
            await opener.click();
            await expect(page.getByRole('dialog')).toBeVisible();
            await page.getByRole('button', { name: 'Close booking calendar' }).click();
            await expect(page.getByRole('dialog')).not.toBeVisible();
            await expect(opener).toBeFocused();
        });

        await test.step('The intercepted calendar simulates completion without an appointment', async () => {
            await opener.click();
            await page.frameLocator('dialog iframe').getByRole('button', { name: 'Complete simulated booking' }).click();
            await expect(page.getByRole('dialog')).toBeVisible();
            expect(intercepted.contact).toHaveLength(0);
            expect(intercepted.unexpected).toEqual([]);
        });
    });
}
