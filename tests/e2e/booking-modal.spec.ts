import { expect, test, type Page } from '@playwright/test';

async function installMockCalendly(page: Page) {
    await page.route(/https:\/\/[^/]*(?:googletagmanager|google-analytics)\.com\//, (route) => route.fulfill({
        contentType: 'application/javascript',
        body: ''
    }));
    await page.route('**/api/analytics-attribution', (route) => route.fulfill({
        contentType: 'application/json',
        body: '{}'
    }));
    await page.route('https://assets.calendly.com/**', (route) => route.fulfill({
        contentType: 'application/javascript',
        body: `window.Calendly = { initInlineWidget({parentElement}) {
            const frame = document.createElement('iframe');
            frame.src = 'https://calendly.com/test-booking';
            parentElement.appendChild(frame);
        } };`
    }));
    await page.route('https://calendly.com/**', (route) => route.fulfill({
        contentType: 'text/html',
        body: `<h1>Available times</h1><button>Choose a time</button>
            <button onclick="parent.postMessage({event:'calendly.event_scheduled',payload:{event:{uri:'preview-test'},invitee:{email:'private@example.com'}}}, '*')">Complete test booking</button>`
    }));
}

async function openBookingModal(page: Page) {
    await installMockCalendly(page);
    await page.goto('/');
    const opener = page.locator('main a[href^="https://calendly.com/"]').first();
    await opener.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.frameLocator('dialog iframe').getByRole('heading', { name: 'Available times' })).toBeVisible();
    return { dialog, opener };
}

test('booking modal fits the desktop viewport and restores keyboard focus', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const { dialog, opener } = await openBookingModal(page);

    const layout = await dialog.evaluate((element: HTMLDialogElement) => {
        const bounds = element.getBoundingClientRect();
        return {
            x: bounds.x,
            y: bounds.y,
            right: bounds.right,
            bottom: bounds.bottom,
            horizontalOverflow: element.scrollWidth - element.clientWidth,
            bodyOverflow: document.body.style.overflow,
            focusInside: element.contains(document.activeElement)
        };
    });
    expect(layout.x).toBeGreaterThanOrEqual(24);
    expect(layout.y).toBeGreaterThanOrEqual(24);
    expect(layout.right).toBeLessThanOrEqual(1416);
    expect(layout.bottom).toBeLessThanOrEqual(876);
    expect(layout.horizontalOverflow).toBe(0);
    expect(layout.bodyOverflow).toBe('hidden');
    expect(layout.focusInside).toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
});

test('booking modal uses the full portrait mobile viewport without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const { dialog, opener } = await openBookingModal(page);

    const layout = await dialog.evaluate((element: HTMLDialogElement) => {
        const bounds = element.getBoundingClientRect();
        return {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            horizontalOverflow: element.scrollWidth - element.clientWidth,
            bodyOverflow: document.body.style.overflow,
            focusInside: element.contains(document.activeElement)
        };
    });
    expect(layout).toMatchObject({
        x: 0,
        y: 0,
        width: 390,
        horizontalOverflow: 0,
        bodyOverflow: 'hidden',
        focusInside: true
    });
    expect(layout.height).toBeCloseTo(844, 0);
    await expect(page.getByText('Prefer a separate tab?')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
});

test('booking modal closes from its close control and desktop backdrop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const { dialog, opener } = await openBookingModal(page);

    await page.getByRole('button', { name: 'Close booking calendar' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();

    await opener.click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(4, 4);
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
});

test('preview completion simulation sends no analytics or appointment request', async ({ page }) => {
    const outbound: string[] = [];
    page.on('request', (request) => {
        const url = request.url();
        if (/google-analytics\.com|googletagmanager\.com|\/api\/analytics-attribution/.test(url)) outbound.push(url);
    });
    await openBookingModal(page);

    const complete = page.frameLocator('dialog iframe').getByRole('button', { name: 'Complete test booking' });
    await complete.click();
    await complete.click();
    await page.waitForTimeout(250);

    expect(outbound).toEqual([]);
});
