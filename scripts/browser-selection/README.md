# DataTable selection profiling

The fixture is `datatable/dataTable058.xhtml` in the integration-test application.
It renders a fixed list of integer row keys without selection AJAX behaviors.
Query parameters: `rows=100` (capped at 2000), `native=true` for native checkboxes,
and `all=true` for the cross-page `@all` selection mode. The performance harness
expects page-only selection; the `@all` variant is for correctness checks.

Build and serve from the repository root:

```sh
mvn -B -ntp -pl primefaces-integration-tests -am install -DskipTests -Pmojarra-4.0
mvn -B -ntp -f primefaces-integration-tests/pom.xml jetty:run -Pmojarra-4.0,browser-selection
```

In another terminal:

```sh
cd scripts/browser-selection
npm ci
npx playwright install chromium
SOURCE_COMMIT=$(git rev-parse HEAD) MODE=header node profile-selection.mjs \
  'http://127.0.0.1:8080/datatable/dataTable058.xhtml?rows=500' perfTable results/header-500
```

`MODE=api` measures `selectAllRowsOnPage()` / `unselectAllRowsOnPage()`;
`MODE=header` dispatches a DOM click through the header's actual listener.
This measures synchronous selection-handler time, not end-to-end physical input
latency or the paint after a click. Selection and unselection timings exclude
assertions; total cycle timings include correctness checks.

Each invocation starts a fresh Chromium process, warms up ten cycles, collects
30 unprofiled samples, counts serialization calls in a separate cycle, then
records ten cycles with the Chrome CPU profiler. It writes raw timings, browser
and Node versions, the supplied source SHA, script/layout/style metric deltas,
sampled self-time, and a DevTools-compatible `.cpuprofile`. Sampled self-time is
statistical; inspect call stacks for inclusive cost.

Use page sizes 100, 500, 2000. Compare exact baseline/candidate commits on the
same idle machine, alternating order across at least five fresh-process runs.
Keep browser, JVM, data and viewport identical. Do not interpret results from
different GitHub runners as a controlled A/B comparison. The initial workflow
collects evidence for one commit and does not enforce a performance threshold.

The `DataTable browser selection profile` workflow runs on the research branch,
checks the `DataTable-selection` integration-test group, and uploads raw profiles
and test reports. No speedup is claimed before measurements are complete.
