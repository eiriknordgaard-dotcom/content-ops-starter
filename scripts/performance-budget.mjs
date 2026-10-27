import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const auditNames = { lcp: 'largest-contentful-paint', tbt: 'total-blocking-time', cls: 'cumulative-layout-shift' };

export function evaluateReports(reports, budget, now = Date.now()) {
    const errors = [], warnings = [], pages = [];
    if (budget.schema !== 1 || budget.runsPerPage !== 3) throw new Error('Unsupported performance budget');
    const groups = Object.fromEntries(Object.keys(budget.previewBaseline.pages).map(route => [route, []]));
    const identities = Object.fromEntries(Object.keys(groups).map(route => [route, new Set()]));
    for (const report of reports) {
        let url;
        try { url = new URL(report.finalUrl); } catch { errors.push('Invalid report URL'); continue; }
        const route = url.pathname;
        if (!['http://127.0.0.1:4173', 'http://localhost:4173'].includes(url.origin) || !groups[route] || url.search || url.hash) {
            errors.push('Unexpected measurement target'); continue;
        }
        const settings = report.configSettings || {};
        const profile = budget.profile;
        const major = Number(report.userAgent?.match(/(?:Headless)?Chrome\/(\d+)/)?.[1]);
        if (settings.formFactor !== profile.formFactor || settings.throttlingMethod !== profile.throttlingMethod
            || settings.throttling?.cpuSlowdownMultiplier !== profile.cpuSlowdownMultiplier
            || settings.throttling?.rttMs !== profile.rttMs || settings.throttling?.throughputKbps !== profile.throughputKbps
            || settings.screenEmulation?.width !== profile.viewportWidth
            || settings.screenEmulation?.height !== profile.viewportHeight || settings.screenEmulation?.deviceScaleFactor !== profile.deviceScaleFactor
            || settings.screenEmulation?.mobile !== true || settings.screenEmulation?.disabled !== false
            || report.lighthouseVersion !== profile.lighthouseVersion || major !== profile.chromeMajor) {
            errors.push(`${route}: measurement profile changed; review and rebaseline`); continue;
        }
        const age = now - Date.parse(report.fetchTime);
        if (!Number.isFinite(age) || age < -300000 || age > budget.maxReportAgeHours * 3600000 || report.runtimeError) {
            errors.push(`${route}: stale, invalid, or incomplete measurement`); continue;
        }
        if (identities[route].has(report.fetchTime)) { errors.push(`${route}: duplicate measurement identity`); continue; }
        identities[route].add(report.fetchTime);
        const metrics = Object.fromEntries(Object.entries(auditNames).map(([key, name]) => [key, report.audits?.[name]?.numericValue]));
        metrics.score = report.categories?.performance?.score;
        if (Object.values(metrics).some(value => typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
            errors.push(`${route}: required metrics missing`); continue;
        }
        groups[route].push(metrics);
    }
    for (const [route, runs] of Object.entries(groups)) {
        if (runs.length !== budget.runsPerPage) { errors.push(`${route}: expected exactly three complete runs`); continue; }
        const values = Object.fromEntries(['lcp', 'tbt', 'cls', 'score'].map(metric => [metric, median(runs.map(run => run[metric]))]));
        const baseline = budget.previewBaseline.pages[route];
        const lcpLimit = Math.min(budget.blocking.lcp, Math.max(baseline.lcp * (1 + budget.lcpRegression.fraction), baseline.lcp + budget.lcpRegression.minimumMarginMs));
        for (const metric of ['lcp', 'tbt', 'cls']) {
            const limit = metric === 'lcp' ? lcpLimit : budget.blocking[metric];
            if (values[metric] > limit) errors.push(`${route}: median ${metric} ${values[metric].toFixed(2)} exceeds ${limit.toFixed(2)}`);
            else if (values[metric] > budget.warning[metric]) warnings.push(`${route}: median ${metric} is in the review band`);
        }
        const lcpValues = runs.map(run => run.lcp);
        if ((Math.max(...lcpValues) - Math.min(...lcpValues)) / Math.max(values.lcp, 1) > budget.varianceWarningFraction) warnings.push(`${route}: high LCP variance; repeat under a quiet, identical profile`);
        if (values.score < budget.warning.score) warnings.push(`${route}: advisory performance score below ${budget.warning.score}`);
        pages.push({ route, median: values, lcpLimit });
    }
    return { schema: 1, passed: errors.length === 0, errors, warnings, pages };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const budget = JSON.parse(await readFile(new URL('../performance-budget.json', import.meta.url), 'utf8'));
    const directory = path.resolve(process.argv[2] || '.lighthouseci');
    const files = (await readdir(directory)).filter(file => /^lhr-.*\.json$/.test(file));
    const reports = await Promise.all(files.map(file => readFile(path.join(directory, file), 'utf8').then(JSON.parse)));
    const result = evaluateReports(reports, budget);
    await mkdir('test-results', { recursive: true });
    await writeFile('test-results/performance-budget.json', JSON.stringify(result, null, 2));
    for (const warning of result.warnings) console.warn(`Performance warning: ${warning}`);
    for (const error of result.errors) console.error(`Performance failure: ${error}`);
    if (!result.passed) process.exitCode = 1;
    else console.log(`Performance budget passed for ${result.pages.length} pages, using three-run medians.`);
}
