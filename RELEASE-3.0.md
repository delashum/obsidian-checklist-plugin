# Checklist 3.0

Maintainer UI review completed. Version: **3.0.0**.

## Scope

A focused task sidebar: native Obsidian styling and navigation, fast controls, useful structure, and safe updates to the source notes. This consolidates the sidebar work in #218 and incorporates the hierarchy algorithm from #213 while preserving the 2.2.15 reliability fixes.

| Area | Included | Issues addressed |
| --- | --- | --- |
| Sidebar | Theme colors, consistent row sizing, top-aligned controls, clearable search, Display panel, clickable headings, source labels, scope switch | #28, #57, #59, #68, #136, #168, #171, #212 |
| Organization | Task hierarchy, nested Page/Tag groups, Folder grouping, collapse/expand all groups, source order, recent modification order, configured tag order | #25, #52, #99, #122, #206 |
| Filters | Excluded tags/blocks, correct tag groups in all-task mode, folder focus and explorer context menu, tag picker command, combined include/exclude globs | #55, #73, #101, #118 |
| Native access | Ribbon button, source-line reveal/highlight, registered-pane restoration without automatic duplicate creation | #58, #192, #199 |
| Reliability | Four concurrent reads, reusable per-file renderer, no retained source contents, debounced updates/settings, cached display filters, 200-task render batches, isolated failures and retry, atomic writes, CRLF preservation, stale-line protection | #186; related large-vault/mobile reports below |
| Integration | Optional public Tasks API completion, including dates and recurrence | #180, #200 |

The related requests #74 (automatic folder selection), #127 (alignment option), #172 (custom-status icons), #202 (newer Obsidian chevron rendering), and #205 (full folder hierarchy) receive partial or adjacent improvements. They are not treated as fully resolved by this candidate.

The performance changes target #119, #143, #159, #176, #183, #184, and #188, but these reports need validation against their original large-vault/mobile conditions before closure. No iOS/Android device validation has been performed.

## Deliberately outside this pass

- A recurrence engine separate from Tasks, arbitrary status workflows, or checkbox properties as tasks.
- Batch task moves, exporting/embedding a second copy of tasks, drag-and-drop manual ordering.
- Regex query languages, dynamic date-tag substitution, and daily-note scheduling rules.

These issues remain open for the maintainer’s later scope review. No feature request is being rejected solely because it is not in this preview.

## Compatibility and behavior changes

- Minimum Obsidian version: **1.5.0**, for the modern API baseline and atomic file processing.
- Existing settings and pane placement are retained. New installations open the pane via the ribbon or command; loading the plugin does not create a pane automatically.
- Page/folder groups show each source task once even if it has multiple matching tags. Tag groups can show the same task under multiple tags; the header counts distinct tasks.
- New installations default to tag grouping, no sub-grouping, flat tasks, and newest-created first. Groups sorting applies to both grouping levels. Existing sort settings retain their meanings: creation-time sorts remain creation-time sorts; modification-time sort is an explicit option.
- Nonblank checkbox states retain their existing completed interpretation. Full Tasks custom-status semantics are not implemented.
- The first 200 matching tasks render initially, in the selected grouping/sorting order. Search/filtering examines all cached tasks; Show more progressively renders the rest.

## Validation

- TypeScript and production bundle pass.
- 51 regression tests pass, covering refresh/rename/deletion races, hierarchy, grouping, tag filters, exclusions, file globs, atomic completion, stale lines, CRLF, read/save failures, navigation, render limits, and Tasks API output.
- Obsidian **1.7.7**, isolated local vault: pane loads, nested groups/tasks work, completing a child writes the correct source line, source-line navigation reveals/highlights the task, wiki links open the linked note, and repeated reloads do not add another pane.
- Actual **Tasks 7.21.0** integration: recurring task completion generated the next dated task and retained the completed occurrence with its completion date. Ordinary completion also added the date. The current Tasks release requires a newer Obsidian than this local installation, so it was not used for the runtime check.
- Synthetic in-memory baseline before the final dependency refresh: 1,000 files / 10,000 tasks scanned in about 311 ms, search about 30 ms, unchanged refresh about 27 ms with zero further file reads. This is a mocked parser/view benchmark, not a real-vault or mobile performance guarantee.
- Dependency updates patch the bundled Markdown parser, glob dependencies, and build tool. `npm audit` has two remaining moderate findings in the Svelte 3/preprocessor chain; the listed SSR paths are not used by this client-only plugin. A Svelte major migration is deferred rather than bundled into this UI pass.

## Final UI review

Validated in desktop Obsidian 1.13.7: native checkboxes, compact controls, optional nested task display, wrapped task alignment, theme-derived colors, and a one-second completion delay with undo. Delay completion is enabled by default and can be disabled in Display → Options.

Mobile devices, representative large vaults, and community themes have not been verified; performance-related reports remain open.
