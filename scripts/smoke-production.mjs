const siteUrl = process.env.SITE_URL || 'https://eiriknordgaard.com';
const isPreview = process.env.DEPLOY_CONTEXT === 'deploy-preview';

const checks = [
    { path: '/', status: 200, contains: ['Outsourced FINOP Consultant', '<div id="__next"><div class="sb-page"'] },
    {
        path: '/sitemap.xml',
        status: 200,
        contains: ['<urlset', '/focus-reporting-net-capital-support/', '/how-to-prepare-broker-dealer-focus-report/']
    },
    { path: '/robots.txt', status: 200, contains: 'Sitemap: https://eiriknordgaard.com/sitemap.xml' },
    { path: '/missing-production-monitor/', status: 404, contains: 'That page is not available.' },
    { path: '/api/calendly-webhook', status: 200, contains: '"ok":true' },
    { path: '/api/contact-submit', status: 200, contains: ['"ok":true', '"configured":true'] },
    {
        path: '/focus-reporting-net-capital-support/',
        status: 200,
        contains: ['FOCUS Reporting and Net Capital Support', '<div id="__next"><div class="sb-page"']
    },
    {
        path: '/how-to-prepare-broker-dealer-focus-report/',
        status: 200,
        contains: ['How to Prepare a Broker-Dealer FOCUS Report', '<div id="__next"><div class="sb-page"']
    },
    { path: '/fractional-finop/', status: 200, contains: '<div id="__next"><div class="sb-page"' }
];

const failures = [];

for (const check of checks) {
    // Drafts deliberately lack production conversion secrets and Netlify adds
    // noindex headers. Check those requirements only on the production domain.
    if (isPreview && check.path.startsWith('/api/')) continue;
    try {
        const response = await fetch(new URL(check.path, siteUrl), {
            redirect: 'manual',
            signal: AbortSignal.timeout(10_000),
            headers: { 'user-agent': 'finop-production-monitor/1.0' }
        });
        const body = await response.text();
        if (check.status === 200 && !check.path.startsWith('/api/') && check.path.endsWith('/')) {
            const canonical = new URL(check.path, 'https://eiriknordgaard.com').toString();
            if (!body.includes(`rel="canonical" href="${canonical}"`)) failures.push(`${check.path}: canonical URL is incorrect`);
            if (/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(body)) failures.push(`${check.path}: unexpected noindex directive`);
            if (!isPreview && /noindex/i.test(response.headers.get('x-robots-tag') || '')) failures.push(`${check.path}: unexpected noindex header`);
            if (isPreview && !/noindex/i.test(response.headers.get('x-robots-tag') || '')) failures.push(`${check.path}: preview should be excluded from indexing`);
            if (check.path === '/') {
                const appScript = body.match(/src="([^" ]*\/_app-[^" ]+\.js)"/);
                if (!appScript) failures.push('Homepage: analytics app bundle was not found');
                else {
                    const bundle = await fetch(new URL(appScript[1], siteUrl), { signal: AbortSignal.timeout(10_000) });
                    const script = await bundle.text();
                    if (!bundle.ok || !script.includes('G-JKBTSP4HK1')) failures.push('Homepage: production GA4 measurement ID is missing');
                }
            }
        }

        if (response.status !== check.status) {
            failures.push(`${check.path}: expected ${check.status}, received ${response.status}`);
        } else if (!(Array.isArray(check.contains) ? check.contains.every((value) => body.includes(value)) : body.includes(check.contains))) {
            failures.push(`${check.path}: expected content was missing`);
        }
    } catch (error) {
        failures.push(`${check.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

const redirectResponse = await fetch(new URL('/pricing', siteUrl), {
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000),
    headers: { 'user-agent': 'finop-production-monitor/1.0' }
});

if (redirectResponse.status !== 301 || redirectResponse.headers.get('location') !== '/fractional-finop/') {
    failures.push('/pricing: permanent redirect is incorrect');
}

const linkedinRedirect = await fetch(new URL('/go/linkedin/finop-consulting', siteUrl), {
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000),
    headers: { 'user-agent': 'finop-production-monitor/1.0' }
});

const linkedinLocation = linkedinRedirect.headers.get('location');
if (
    linkedinRedirect.status !== 302 ||
    linkedinLocation !== '/?utm_source=linkedin&utm_medium=organic_social&utm_campaign=finop_consulting&utm_content=homepage'
) {
    failures.push('/go/linkedin/finop-consulting: campaign redirect is incorrect');
}

if (failures.length > 0) {
    console.error(`Production smoke test failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
    process.exit(1);
}

console.log(`Production smoke test passed for ${siteUrl}.`);
