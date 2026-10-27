import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { evaluateReports } from './performance-budget.mjs';

const budget = JSON.parse(await readFile(new URL('../performance-budget.json', import.meta.url), 'utf8'));
const now = Date.UTC(2026, 9, 27, 19);
function fixture() {
    return Object.entries(budget.previewBaseline.pages).flatMap(([route, baseline]) => Array.from({ length: 3 }, (_, index) => ({
        finalUrl: `http://127.0.0.1:4173${route}`, fetchTime: new Date(now - index * 1000).toISOString(),
        lighthouseVersion: budget.profile.lighthouseVersion, userAgent: `HeadlessChrome/${budget.profile.chromeMajor}.0.0.0`,
        configSettings: { formFactor: 'mobile', throttlingMethod: 'simulate', throttling: { cpuSlowdownMultiplier: 4, rttMs: 150, throughputKbps: 1638.4 }, screenEmulation: { width: 412, height: 823, deviceScaleFactor: 1.75, mobile: true, disabled: false } },
        audits: { 'largest-contentful-paint': { numericValue: baseline.lcp }, 'total-blocking-time': { numericValue: baseline.tbt }, 'cumulative-layout-shift': { numericValue: baseline.cls } },
        categories: { performance: { score: baseline.score } }
    })));
}

test('accepted baseline and one cold outlier pass through median aggregation', () => {
    const reports = fixture();
    reports[0].audits['largest-contentful-paint'].numericValue = 6500;
    const result = evaluateReports(reports, budget, now);
    assert.equal(result.passed, true); assert.ok(result.warnings.some(warning => warning.includes('variance')));
});
test('a material regression blocks even when the score remains high', () => {
    const reports = fixture();
    for (const report of reports.slice(0, 3)) report.audits['largest-contentful-paint'].numericValue *= 1.5;
    assert.equal(evaluateReports(reports, budget, now).passed, false);
});
test('slow script work and visible layout instability block independently', () => {
    for (const [metric, value] of [['total-blocking-time', 400], ['cumulative-layout-shift', 0.2]]) {
        const reports = fixture();
        for (const report of reports.slice(0, 3)) report.audits[metric].numericValue = value;
        assert.equal(evaluateReports(reports, budget, now).passed, false);
    }
});
test('missing, stale, nonfinite, and failed reports cannot be shown as healthy', () => {
    assert.equal(evaluateReports(fixture().slice(1), budget, now).passed, false);
    for (const change of [r => r.fetchTime = 'invalid', r => r.fetchTime = new Date(now - 25 * 3600000).toISOString(),
        r => r.audits['total-blocking-time'].numericValue = NaN, r => r.runtimeError = { code: 'FAILED' }]) {
        const reports = fixture(); change(reports[0]); assert.equal(evaluateReports(reports, budget, now).passed, false);
    }
});
test('unexpected production origin, duplicate runs, and profile changes require review', () => {
    const reports = fixture();
    reports[0].finalUrl = 'https://eiriknordgaard.com/';
    assert.equal(evaluateReports(reports, budget, now).passed, false);
    assert.equal(evaluateReports([...fixture(), fixture()[0]], budget, now).passed, false);
    const duplicated = fixture(); duplicated[0] = duplicated[1];
    assert.equal(evaluateReports(duplicated, budget, now).passed, false);
    const changed = fixture(); changed[0].configSettings.throttling.cpuSlowdownMultiplier = 1;
    assert.equal(evaluateReports(changed, budget, now).passed, false);
});
test('a low score alone stays advisory rather than creating a vanity gate', () => {
    const reports = fixture(); reports.forEach(r => r.categories.performance.score = 0.7);
    const result = evaluateReports(reports, budget, now);
    assert.equal(result.passed, true); assert.equal(result.warnings.length, 3);
});
