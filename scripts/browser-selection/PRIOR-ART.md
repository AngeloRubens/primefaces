# Prior-art review (2026-10-16)

Reviewed upstream at `7771665c1dd1ff3c1263a5d272edf5a6fe86fc4e` using GitHub
issue/PR search, PR file diffs, issue discussions and local Git history.
Searches covered open and closed records for selection/performance, the exact
methods `selectAllRowsOnPage`, `writeSelections`, `toggleCheckAll`,
`updateHeaderCheckbox`, and DataTable slow/optimize/batch/bulk/serialization.
All 9 currently open PRs were checked by changed files; the two changing
`datatable.widget.js` were reviewed for overlap. This is a dated search result,
not proof that no unindexed or external work exists.

| Area | Existing work | Decision |
| --- | --- | --- |
| SelectManyMenu select-all DOM work | [#2089](https://github.com/primefaces/primefaces/issues/2089), closed PRs [#2090](https://github.com/primefaces/primefaces/pull/2090) and [#3964](https://github.com/primefaces/primefaces/pull/3964); direct commit `a184e9d6fec080809c50367443c467c9cf359648` added bulk methods | Exclude; do not present the historical optimization as new |
| DataTable cell-edit form payload | Merged [#11160](https://github.com/primefaces/primefaces/pull/11160) disables inactive editor inputs | Exclude |
| AJAX DOM cleansing | Merged [#12092](https://github.com/primefaces/primefaces/pull/12092) skips select/SVG descendants | Exclude |
| Virtual-scroll row-selection processing | [#4804](https://github.com/primefaces/primefaces/issues/4804), fixed in `372cd45ce4221348dfb3b4a34938fa611ab65bec` by limiting server iteration | Exclude |
| Checkbox range events | Merged [#13771](https://github.com/primefaces/primefaces/pull/13771) uses silent range selection | Preserve; silent concerns events, not hidden-input synchronization |
| Global header checkbox semantics | Merged [#13629](https://github.com/primefaces/primefaces/pull/13629) limits header auto-checking to page-only mode | Preserve |
| Disabled rows during range selection | Merged [#13241](https://github.com/primefaces/primefaces/pull/13241) filters selectable rows | Preserve |
| Global selection/paging correctness | [#3535](https://github.com/primefaces/primefaces/issues/3535), [#13640](https://github.com/primefaces/primefaces/issues/13640), [#12196](https://github.com/primefaces/primefaces/issues/12196) | Distinct from browser bulk-handler cost; closed does not imply fixed (e.g. #3535/#12196 are not planned) |
| Very wide editable tables | [#12912](https://github.com/primefaces/primefaces/issues/12912) closed as not planned; maintainers recommend a sheet component | Do not reopen this scenario as a generic performance fix |
| DataTable header/filter layout | Open [#15160](https://github.com/primefaces/primefaces/pull/15160) adds filter controls and header alignment; open [#15232](https://github.com/primefaces/primefaces/pull/15232) changes reflow selectors | Avoid duplicating active header/layout work |

Remaining candidate: defer redundant selection-holder serialization and/or
header-checkbox scans inside synchronous page-selection operations. None of the
reviewed open PR diffs changes these bulk methods, and current upstream still
performs the updates per row. The merged selection fixes above do not batch
those updates. Profiling must establish whether this candidate is worth fixing
before changing production code.
