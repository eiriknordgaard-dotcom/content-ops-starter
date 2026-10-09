import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync(new URL('../src/utils/calendly-events.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const context = vm.createContext({ exports: {}, URL });
vm.runInContext(compiled, context);
const { isScheduledCalendlyEvent, isCalendlyBookingLink } = context.exports;

test('booking completion requires the active Calendly frame and exact origin', () => {
    const frame = {};
    const valid = { origin: 'https://calendly.com', source: frame, data: { event: 'calendly.event_scheduled' } };
    assert.equal(isScheduledCalendlyEvent(valid, frame), true);
    assert.equal(isScheduledCalendlyEvent(valid, null), false);
    assert.equal(isScheduledCalendlyEvent({ ...valid, source: {} }, frame), false);
    assert.equal(isScheduledCalendlyEvent({ ...valid, origin: 'https://calendly.com.evil.example' }, frame), false);
    assert.equal(isScheduledCalendlyEvent({ ...valid, data: { event: 'calendly.date_and_time_selected' } }, frame), false);
    assert.equal(isScheduledCalendlyEvent({ ...valid, data: null }, frame), false);
});

test('only HTTPS Calendly links open the on-site booking calendar', () => {
    assert.equal(isCalendlyBookingLink('https://calendly.com/eirik-nordgaard/30min'), true);
    assert.equal(isCalendlyBookingLink('https://calendly.com.evil.example/'), false);
    assert.equal(isCalendlyBookingLink('https://example.com/?url=calendly.com/'), false);
    assert.equal(isCalendlyBookingLink('javascript:alert(1)'), false);
});
