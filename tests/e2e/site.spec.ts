import { expect, test } from '@playwright/test';

test('homepage exposes the primary conversion path and trust links', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/FINOP Consultant/i);
    await expect(page.getByRole('heading', { level: 1, name: /Outsourced FINOP Consultant/i })).toBeVisible();

    const scheduleLink = page.getByRole('link', { name: /Schedule a confidential 30-minute introductory call/i }).first();
    await expect(scheduleLink).toHaveAttribute('target', '_blank');
    await expect(scheduleLink).toHaveAttribute('rel', /noopener/);

    await expect(page.getByRole('link', { name: /LinkedIn/i }).last()).toBeVisible();
    await expect(page.getByRole('link', { name: /BrokerCheck/i }).last()).toBeVisible();
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        'content',
        'https://eiriknordgaard.com/images/finop-social-card-v2.png'
    );
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630');
});

test('mobile navigation opens as a dropdown and closes after navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const menuButton = page.getByRole('button', { name: 'Open Menu' });
    await menuButton.click();
    await expect(page.getByRole('button', { name: 'Close Menu' })).toBeVisible();

    const mobileServicesLink = page.getByRole('link', { name: 'Services', exact: true }).last();
    await mobileServicesLink.click();
    await expect(page.locator('#services')).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Open Menu' })).toBeVisible();
});

test('client illustrations animate as each illustration enters the mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (let index = 0; index < 2; index += 1) {
        await page.goto('/');

        const illustration = page.locator('[data-client-illustration="true"]').nth(index);

        await expect(illustration.locator('..')).toHaveClass(/client-illustration-pending/);
        await expect(illustration).toHaveAttribute('data-animation-replay-count', '0');

        await illustration.scrollIntoViewIfNeeded();
        await expect(illustration).toHaveAttribute('data-animation-replay-count', '1');
        await expect(illustration.locator('..')).not.toHaveClass(/client-illustration-pending/);
        await expect(illustration).toHaveJSProperty('complete', true);
        expect(await illustration.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    }
});

test('theme preference survives a page reload', async ({ page }) => {
    await page.goto('/');

    const toggle = page.getByRole('button', { name: /Switch to dark mode|Toggle color theme/ });
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('contact form succeeds without leaving the page', async ({ page }) => {
    await page.route('**/api/contact-submit', async (route) => {
        await route.fulfill({ status: 200, contentType: 'text/html', body: 'ok' });
    });
    await page.goto('/#contact');

    await page.getByLabel('Full name').fill('Automated Test');
    await page.getByLabel('Work email').fill('qa@example.com');
    await page.getByLabel('How can I help?').fill('Regression test submission');
    await page.getByRole('button', { name: 'Send Confidential Message' }).click();

    await expect(page.getByText('Thank you. Your message has been sent.')).toBeVisible();
    await expect(page).toHaveURL(/#contact$/);
});

test('editorial guide and custom 404 remain accessible', async ({ page }) => {
    await page.goto('/what-does-a-finop-do/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/FINOP/i);
    await expect(page.getByRole('link', { name: 'Eirik Nordgaard', exact: true })).toBeVisible();

    await page.goto('/404/');
    await expect(page.getByRole('link', { name: 'Return home' })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
