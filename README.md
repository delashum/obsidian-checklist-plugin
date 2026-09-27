# Checklist for Obsidian

A task sidebar that stays connected to your notes. Find, organize, and complete Markdown tasks without moving them into a separate system.

> **Checklist 3.0** requires Obsidian 1.5.0 or later. Existing preferences are preserved; new organization features are opt-in.

## Get started

Requires Obsidian **1.5.0 or later**. Open Checklist from the ribbon or **Checklist: Show Checklist pane** in the command palette. Existing panes restore in their saved position; enabling or updating the plugin does not create extra panes.

By default, Checklist finds tasks in blocks tagged `#todo`, including children of tagged tasks:

```markdown
- [ ] Prepare the release #todo/next
  - [ ] Review the sidebar
  - [ ] Write release notes
```

A standalone tag applies to the following block, through the next blank line. A matching tag in a note’s `tags` property includes the whole note. Enable **Include all tasks in matching notes** to use any matching tag as a note-wide selector. Code examples and frontmatter are not tasks.

## Work from the sidebar

- **All notes / This note** switches scope immediately.
- The header’s **Search** icon opens a search field that matches task text, note paths, and tags. Each word must match; use × to clear or Escape to close. Click an inline tag to search for it.
- **Display** controls Page, Tag, or Folder grouping; sub-grouping; sorting; completed tasks; source-note labels; and folder focus.
- **Nested groups** groups pages by tag, or tags/folders by page. Task children remain attached to their parents when sorting. A child whose parent is filtered out becomes a root task.
- Click a group heading to collapse it. The toolbar expands or collapses all groups, including nested groups. Subtasks also have their own collapse control.
- Click a task to open and reveal its line. Click a source-note label or the separate open-note icon to navigate. Wiki links resolve relative to the task’s note.
- Complete a task with its native checkbox. **Delay completion** gives you one second to undo before a hidden completed task disappears; turn it off in Display → Options for immediate removal. Checklist checks that the original line is unchanged and updates the note atomically. It will ask you to refresh a stale task rather than write to a different line.
- **Refresh** is available in the toolbar and command palette. A note that cannot be read does not prevent other notes from loading; the pane shows a retry message.

Large lists initially render 200 distinct tasks. **Show more tasks** expands the list in batches. Search and filters always operate on the full cached collection, and the header count includes all matching tasks.

## Choose what appears

**Included tags:** one per line, with or without `#`. A filter such as `todo/next` matches `#todo/next` and its descendants, but not `#todo/next-week`. Leave empty to capture all tasks; tag grouping still recognizes inline and block tags.

**Excluded tags:** one per line. Exclude a task or tagged block (including children) using tags such as `archive` or `ignore`. An excluded tag in note properties excludes the whole note. This hides tasks without marking them complete.

**File patterns:** newline-separated [minimatch](https://github.com/isaacs/minimatch) globs. Positive patterns are alternatives; negative patterns always exclude. With no positive pattern, all notes are eligible.

```text
Projects/**
Daily/**
!Projects/Archive/**
!Daily/Templates/**
```

**Limit to folder:** enter a vault-relative folder in Display, or right-click a folder in Obsidian’s file explorer and choose **Focus Checklist on this folder**. Subfolders are included. Remove the folder chip to clear the focus.

**Sorting:** use source order for tasks, alphabetical order, file creation time, or recent modification time. **Configured tag order** follows the order of Included tags. The **Groups** sort applies to both groups and sub-groups. Existing sorting preferences are preserved; new installations default to newest-created first.

## Optional Tasks integration

Enable **Complete with Tasks** in Checklist settings to use [Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) **7.2 or later**. Checklist delegates completion to the [documented Tasks API](https://github.com/obsidian-tasks-group/obsidian-tasks/blob/main/docs/Advanced/Tasks%20Api.md), including completion dates and recurring occurrences, then atomically saves the returned Markdown.

This setting is off by default. If enabled while Tasks is unavailable, Checklist shows a message instead of silently using ordinary checkbox completion. Tasks controls its own completion behavior and date preferences. Checklist still treats nonblank checkbox markers as completed; it does not supply a custom-status editor or status-specific filtering.

## Commands and appearance

Commands can be assigned hotkeys in Obsidian:

- Show Checklist pane
- Refresh List
- Toggle current file only
- Toggle completed tasks
- Focus a tag (choose among configured tags)

Checklist uses Obsidian’s interface font, theme colors, focus accents, and touch targets. A single consistent row size is used throughout. CSS snippets can adjust `--checklist-contentFontSize` and `--checklist-row-padding` on `.checklist-plugin-main`.

## Development

Use Node **20.19+** (Node 24 recommended).

```sh
npm ci
npm test
npm run build
```

`npm run dev` watches source files. Install `main.js`, `styles.css`, and `manifest.json` in a test vault’s `.obsidian/plugins/obsidian-checklist-plugin/`, then reload Obsidian. Do not replace your plugin settings file when trying a build.

See [the 3.0 release notes](RELEASE-3.0.md) for scope, issue attribution, validation, and compatibility. The hierarchy implementation incorporates the work in [PR #213](https://github.com/delashum/obsidian-checklist-plugin/pull/213) by SeanYHan888.

New installs keep the tag grouping and newest-first ordering. Saved choices are preserved on upgrade. Nested groups, source-note labels, folder focus, and Tasks integration are opt-in. Choose **Grouping → None** for a single list without group headers, or choose **Sub-grouping → None** to keep only the primary groups.

**Show sub-tasks** is off by default: included tasks stay flat, and tagging a parent does not automatically include untagged children, matching the previous release. Turn it on to include those children and display expandable task trees. Existing tag/block/whole-note filters still apply.
