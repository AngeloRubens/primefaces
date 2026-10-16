// Requires Playwright and a locally served PrimeFaces fixture. See README.md.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const [url, widgetVar, output = 'browser-results'] = process.argv.slice(2);
if (!url || !widgetVar) throw new Error('Usage: node profile-selection.mjs URL WIDGET_VAR [OUTPUT]');
const mode = process.env.MODE || 'api';
if (!['api', 'header'].includes(mode)) throw new Error('MODE must be api or header');
const samples = Number(process.env.SAMPLES || 30);
if (!Number.isInteger(samples) || samples < 10) throw new Error('SAMPLES must be an integer >= 10');
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(name => Boolean(window.PrimeFaces?.widgets?.[name]), widgetVar);
    const fixture = await page.evaluate(name => {
        const w = PF(name);
        if (w.hasBehavior('rowSelect') || w.hasBehavior('rowUnselect')) {
            throw new Error('Fixture must not send selection AJAX requests');
        }
        const rows = w.tbody.children('tr');
        if (!rows.length || rows.filter(':not(.ui-datatable-selectable)').length) {
            throw new Error('Fixture needs only selectable data rows, without grouping/empty rows');
        }
        return { rows: rows.length, primefaces: PrimeFaces.VERSION ?? null };
    }, widgetVar);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    const cycle = async () => page.evaluate(({name, mode}) => {
        const w = PF(name);
        const toggle = () => w.checkAllToggler[0].click();
        const start = performance.now();
        if (mode === 'header') toggle();
        else w.selectAllRowsOnPage();
        const selected = performance.now();
        const expected = w.tbody.children('tr').length;
        if (w.selection.length !== expected) throw new Error('Selection cardinality mismatch');
        if ($(w.selectionHolder).val() !== w.selection.join(',')) throw new Error('Selection holder mismatch');
        const unselectStart = performance.now();
        if (mode === 'header') toggle();
        else w.unselectAllRowsOnPage();
        const end = performance.now();
        if (w.selection.length || $(w.selectionHolder).val() !== '') throw new Error('Unselection mismatch');
        return { selectMs: selected - start, unselectMs: end - unselectStart, totalMs: end - start };
    }, {name: widgetVar, mode});
    await page.evaluate(name => PF(name).unselectAllRows(), widgetVar);
    for (let i = 0; i < 10; i++) await cycle();
    const timings = [];
    for (let i = 0; i < samples; i++) timings.push(await cycle());
    // Instrumentation is kept out of the timing samples.
    await page.evaluate(name => {
        const w = PF(name);
        w.__originalWriteSelections = w.writeSelections;
        w.__writes = 0;
        w.writeSelections = function (...args) {
            this.__writes++;
            return this.__originalWriteSelections(...args);
        };
    }, widgetVar);
    await cycle();
    const writesPerCycle = await page.evaluate(name => {
        const w = PF(name), count = w.__writes;
        w.writeSelections = w.__originalWriteSelections;
        delete w.__originalWriteSelections;
        delete w.__writes;
        return count;
    }, widgetVar);
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
    const before = await cdp.send('Performance.getMetrics');
    await cdp.send('Profiler.start');
    for (let i = 0; i < 10; i++) await cycle();
    const { profile } = await cdp.send('Profiler.stop');
    const after = await cdp.send('Performance.getMetrics');
    await writeFile(`${output}/selection.cpuprofile`, JSON.stringify(profile));
    const selfTime = new Map();
    for (let i = 0; i < (profile.samples?.length ?? 0); i++) {
        const id = profile.samples[i];
        selfTime.set(id, (selfTime.get(id) ?? 0) + profile.timeDeltas[i]);
    }
    const topSelfTime = profile.nodes.map(node => ({
        function: node.callFrame.functionName,
        url: node.callFrame.url,
        line: node.callFrame.lineNumber + 1,
        milliseconds: (selfTime.get(node.id) ?? 0) / 1000,
    })).sort((a, b) => b.milliseconds - a.milliseconds).slice(0, 30);
    const metricDelta = Object.fromEntries(after.metrics.map(({ name, value }) => [
        name, value - (before.metrics.find(metric => metric.name === name)?.value ?? 0),
    ]).filter(([name]) => ['ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration', 'LayoutCount', 'RecalcStyleCount'].includes(name)));
    const percentile = (key, fraction) => {
        const sorted = timings.map(t => t[key]).sort((a, b) => a - b);
        return sorted[Math.ceil(sorted.length * fraction) - 1];
    };
    const result = {
        url, widgetVar, mode, fixture, browser: browser.version(), node: process.version,
        sourceCommit: process.env.SOURCE_COMMIT ?? null,
        samples, writesPerCycle, timings,
        selectMedianMs: percentile('selectMs', 0.5), selectP95Ms: percentile('selectMs', 0.95),
        unselectMedianMs: percentile('unselectMs', 0.5),
        cycleMedianMs: percentile('totalMs', 0.5), cycleP95Ms: percentile('totalMs', 0.95),
        profiledTenCyclesMetrics: metricDelta, topSelfTime, errors,
    };
    await writeFile(`${output}/summary.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    if (errors.length) throw new Error('Browser reported errors; see summary.json');
} finally {
    await browser.close();
}
