const budget = require('./performance-budget.json');
module.exports = {
    ci: {
        collect: {
            startServerCommand: 'node node_modules/serve/build/main.js out -l 4173 --no-clipboard 2>&1',
            startServerReadyPattern: 'Accepting connections|Local:',
            url: [
                'http://127.0.0.1:4173/',
                'http://127.0.0.1:4173/fractional-finop/',
                'http://127.0.0.1:4173/what-does-a-finop-do/'
            ],
            numberOfRuns: 3,
            settings: {
                blockedUrlPatterns: [
                    '*google-analytics.com/*', '*googletagmanager.com/*', '*calendly.com/*',
                    '*netlify-rum.netlify.app/*', '*ingesteer.services-prod.nsvcs.net/*',
                    '*fonts.googleapis.com/*', '*fonts.gstatic.com/*'
                ]
            }
        },
        assert: {
            assertions: {
                'categories:performance': ['warn', { minScore: 0.85, aggregationMethod: 'median' }],
                'largest-contentful-paint': ['error', { maxNumericValue: budget.blocking.lcp, aggregationMethod: 'median' }],
                'total-blocking-time': ['error', { maxNumericValue: budget.blocking.tbt, aggregationMethod: 'median' }],
                'cumulative-layout-shift': ['error', { maxNumericValue: budget.blocking.cls, aggregationMethod: 'median' }],
                'categories:accessibility': ['error', { minScore: 0.95 }],
                'categories:best-practices': ['warn', { minScore: 0.9 }],
                'categories:seo': ['error', { minScore: 0.95 }]
            }
        },
        upload: {
            target: 'filesystem',
            outputDir: './test-results/lighthouse'
        }
    }
};
