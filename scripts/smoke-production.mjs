const siteUrl = process.env.SITE_URL || 'https://eiriknordgaard.com';

const checks = [
    { path: '/', status: 200, contains: 'Outsourced FINOP Consultant' },
    { path: '/sitemap.xml', status: 200, contains: '<urlset' },
    { path: '/robots.txt', status: 200, contains: 'Sitemap: https://eiriknordgaard.com/sitemap.xml' },
    { path: '/missing-production-monitor/', status: 404, contains: 'That page is not available.' },
    { path: '/api/calendly-webhook', status: 200, contains: '"ok":true' }
];

const failures = [];

for (const check of checks) {
    try {
        const response = await fetch(new URL(check.path, siteUrl), {
            redirect: 'manual',
            signal: AbortSignal.timeout(10_000),
            headers: { 'user-agent': 'finop-production-monitor/1.0' }
        });
        const body = await response.text();

        if (response.status !== check.status) {
            failures.push(`${check.path}: expected ${check.status}, received ${response.status}`);
        } else if (!body.includes(check.contains)) {
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

if (failures.length > 0) {
    console.error(`Production smoke test failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
    process.exit(1);
}

console.log(`Production smoke test passed for ${siteUrl}.`);
