module.exports = {
    ci: {
        collect: {
            startServerCommand: 'node node_modules/serve/build/main.js out -l 4173 --no-clipboard 2>&1',
            startServerReadyPattern: 'Local:',
            url: [
                'http://127.0.0.1:4173/',
                'http://127.0.0.1:4173/fractional-finop/',
                'http://127.0.0.1:4173/what-does-a-finop-do/'
            ],
            numberOfRuns: 1,
            settings: {
                preset: 'desktop'
            }
        },
        assert: {
            assertions: {
                'categories:performance': ['warn', { minScore: 0.85 }],
                'categories:accessibility': ['error', { minScore: 0.95 }],
                'categories:best-practices': ['warn', { minScore: 0.9 }],
                'categories:seo': ['error', { minScore: 0.95 }]
            }
        },
        upload: {
            target: 'temporary-public-storage'
        }
    }
};
