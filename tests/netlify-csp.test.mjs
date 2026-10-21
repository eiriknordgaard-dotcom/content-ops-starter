import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const config = readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8');
const csp = config.match(/^\s*Content-Security-Policy = "([^"]+)"$/m)?.[1];

test('Netlify RUM origins remain allowed by the site CSP', () => {
    assert.ok(csp, 'site CSP is configured');
    const directives = Object.fromEntries(csp.split(';').map((entry) => {
        const [name, ...sources] = entry.trim().split(/\s+/);
        return [name, sources];
    }));
    assert.ok(directives['script-src'].includes('https://netlify-rum.netlify.app'));
    assert.ok(directives['connect-src'].includes('https://ingesteer.services-prod.nsvcs.net'));
});
