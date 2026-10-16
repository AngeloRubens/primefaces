import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [url, baselineBundle, baselineCommit, candidateBundle, candidateCommit, output = 'results/comparison'] = process.argv.slice(2);
if (!candidateCommit) {
    throw new Error('Usage: node compare.mjs URL BASE_BUNDLE BASE_SHA CANDIDATE_BUNDLE CANDIDATE_SHA [OUTPUT]');
}
const runs = Number(process.env.RUNS || 5);
if (!Number.isInteger(runs) || runs < 5) throw new Error('RUNS must be an integer >= 5');
await mkdir(output, { recursive: true });
const summaries = [];
for (let run = 0; run < runs; run++) {
    for (const rows of [100, 500, 2000]) {
        for (const mode of ['api', 'header']) {
            const variants = run % 2 ? ['candidate', 'baseline'] : ['baseline', 'candidate'];
            for (const variant of variants) {
                const target = new URL(url);
                target.searchParams.set('rows', rows);
                const destination = resolve(output, `${run + 1}-${mode}-${rows}-${variant}`);
                const result = spawnSync(process.execPath, [
                    new URL('profile-selection.mjs', import.meta.url).pathname,
                    target.href, 'perfTable', destination,
                ], {
                    env: {
                        ...process.env, MODE: mode,
                        COMPONENTS_BUNDLE: resolve(variant === 'baseline' ? baselineBundle : candidateBundle),
                        SOURCE_COMMIT: variant === 'baseline' ? baselineCommit : candidateCommit,
                    }, encoding: 'utf8',
                });
                if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
                const summary = JSON.parse(await readFile(`${destination}/summary.json`, 'utf8'));
                summaries.push({ run: run + 1, rows, mode, variant, ...summary });
                console.log(JSON.stringify({ run: run + 1, rows, mode, variant,
                    selectMs: summary.selectMedianMs, unselectMs: summary.unselectMedianMs }));
                await writeFile(`${output}/summaries.json`, JSON.stringify(summaries, null, 2));
            }
        }
    }
}
