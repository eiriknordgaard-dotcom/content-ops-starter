import axe from 'axe-core';
import { test, expect, type Page } from './fixtures/safe-test';

async function scan(page: Page) {
    await page.addScriptTag({ content: axe.source });
    const results = await page.evaluate(async () => {
        const engine = (window as typeof window & { axe: typeof axe }).axe;
        return engine.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
            resultTypes: ['violations', 'incomplete']
        });
    });
    await test.info().attach('accessibility-scan', { body: JSON.stringify(results, null, 2), contentType: 'application/json' });
    const blocking = results.violations.filter(item => ['serious', 'critical'].includes(item.impact || ''));
    const advisory = results.violations.filter(item => !['serious', 'critical'].includes(item.impact || ''));
    if (advisory.length) console.warn('Accessibility advisory:', advisory.map(item => `${item.id}: ${item.nodes.length} affected elements`).join('; '));
    expect(blocking.map(item => ({ id: item.id, impact: item.impact, targets: item.nodes.map(node => node.target) }))).toEqual([]);
}

test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!['chromium', 'iphone-portrait'].includes(testInfo.project.name), 'Scan desktop Chromium and portrait WebKit; the behavior suite covers all five browser profiles.');
    await page.emulateMedia({ reducedMotion: 'reduce' });
});

for (const theme of ['light', 'dark'] as const) {
    test.describe(`${theme} theme`, () => {
        test.beforeEach(async ({ page }) => {
            await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        });

        for (const route of ['/', '/fractional-finop/', '/what-does-a-finop-do/']) {
            test(`critical page ${route} has no serious or critical automated accessibility violations`, async ({ page }) => {
                await page.goto(route);
                await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
                await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
                await scan(page);
                if (route === '/') {
                    const path = test.info().outputPath('homepage-preview.png');
                    await page.screenshot({ path, fullPage: true });
                    await test.info().attach('homepage-preview', { path, contentType: 'image/png' });
                }
            });
        }

        test('primary action retains accessible contrast when hovered and focused', async ({ page }) => {
            await page.goto('/');
            await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
            const action = page.locator('.hero-actions .sb-component-button-primary').first();
            await action.hover();
            await scan(page);
            await action.focus();
            await expect(action).toBeFocused();
            await scan(page);
        });

        test('booking dialog controls pass the same accessibility gate', async ({ page }) => {
            await page.route('https://assets.calendly.com/**', route => route.fulfill({
                contentType: 'application/javascript',
                body: `window.Calendly = { initInlineWidget({parentElement}) {
                    const frame = document.createElement('iframe'); frame.title = 'Simulated booking';
                    frame.srcdoc = '<!doctype html><html lang="en"><title>Simulated booking</title><main><h1>Available times</h1><button>Choose a time</button></main></html>';
                    parentElement.appendChild(frame);
                } };`
            }));
            await page.goto('/');
            await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
            await page.locator('main a[href^="https://calendly.com/"]').first().click();
            await expect(page.getByRole('dialog')).toBeVisible();
            await scan(page);
        });
    });
}
