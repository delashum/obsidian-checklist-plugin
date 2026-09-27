const {test} = require('node:test')
const assert = require('node:assert/strict')
const {buildSync} = require('esbuild')
const Module = require('module')
const path = require('path')

class TFile {
  constructor(name, content) {
    this.path = name
    this.name = name
    this.extension = 'md'
    this.stat = {mtime: 10, ctime: 1}
    this.content = content
  }
}
class ItemView {
  constructor(leaf) {
    this.app = leaf.app
  }
  registerEvent() {}
}
const obsidian = {
  TFile,
  ItemView,
  Notice: class {},
  FuzzySuggestModal: class {},
  Plugin: class {
    onunload() {}
  },
  PluginSettingTab: class {},
  parseFrontMatterTags: fm =>
    (fm?.tags || []).map(t => (t.startsWith('#') ? t : '#' + t)),
}
function load(entry) {
  const result = buildSync({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
    external: ['obsidian', '*.svelte'],
  })
  const m = new Module(path.resolve(entry))
  m.paths = module.paths
  m.require = id =>
    id === 'obsidian'
      ? obsidian
      : id.endsWith('.svelte')
      ? class {}
      : require(id)
  m._compile(result.outputFiles[0].text, path.resolve(entry))
  return m.exports
}
const {parseTodos, toggleTodoItem} = load('src/utils/tasks.ts')
const View = load('src/view.ts').default
function fixture(content = '#todo\n- [ ] task') {
  const file = new TFile('note.md', content)
  let metadata = {tags: [tag('#todo', 0)]}
  const files = [file]
  let reads = 0
  const app = {
    vault: {
      getMarkdownFiles: () => files,
      cachedRead: async f => {
        reads++
        return f.content
      },
      read: async f => f.content,
      process: async (f, update) => {
        f.content = update(f.content)
        return f.content
      },
      getAbstractFileByPath: () => file,
    },
    metadataCache: {getFileCache: () => metadata},
    workspace: {getActiveFile: () => null},
  }
  const settings = {
    todoPageName: 'todo',
    _hiddenTags: [],
    _collapsedSections: [],
    includeFiles: '',
    showChecked: false,
    showAllTodos: false,
    showOnlyActiveFile: false,
    groupBy: 'page',
    subGroups: false,
  }
  const view = new View({app}, {getSettingValue: key => settings[key]})
  return {
    file,
    files,
    app,
    settings,
    view,
    setMetadata: value => (metadata = value),
    reads: () => reads,
  }
}
function tag(text, line) {
  return {tag: text, position: {start: {line}, end: {line}}}
}
const parse = f =>
  parseTodos(
    f.files,
    ['todo'],
    f.app.metadataCache,
    f.app.vault,
    '',
    false,
    false,
    0,
  )

test('removing the last tag replaces cached tasks with an empty result', async () => {
  const f = fixture()
  await f.view.refresh()
  assert.equal(f.view.groupedItems[0].todos.length, 1)
  f.file.content = '- [ ] task'
  f.setMetadata({tags: []})
  await f.view.refresh()
  assert.equal(f.view.groupedItems.length, 0)
})
test('rename prunes the old path even when mtime is unchanged', async () => {
  const f = fixture()
  await f.view.refresh()
  f.file.path = f.file.name = 'renamed.md'
  await f.view.refresh()
  assert.deepEqual([...f.view.itemsByFile.keys()], ['renamed.md'])
  assert.equal(f.view.groupedItems[0].todos[0].filePath, 'renamed.md')
})
test('manual full refresh repairs stale entries and skips deleted files', async () => {
  const f = fixture()
  await f.view.refresh()
  f.file.content = '#todo\n- [ ] changed'
  await f.view.refresh(true)
  assert.equal(f.view.groupedItems[0].todos[0].originalText, 'changed')
  f.files.length = 0
  await f.view.refresh(true)
  assert.equal(f.view.groupedItems.length, 0)
})
test('late metadata changes are reparsed without changing mtime', async () => {
  const f = fixture()
  f.setMetadata({tags: []})
  await f.view.refresh()
  f.setMetadata({tags: [tag('#todo', 0)]})
  await f.view.refresh()
  assert.equal(f.view.groupedItems[0].todos.length, 1)
  const reads = f.reads()
  await f.view.refresh()
  assert.equal(f.reads(), reads)
})
test('overlapping blocks and repeated inline tags only produce one task per tag', async () => {
  const f = fixture('#todo\n- [ ] task #todo #todo')
  f.setMetadata({tags: [tag('#todo', 0), tag('#todo', 1), tag('#todo', 1)]})
  const parsed = await parse(f)
  assert.equal(parsed.get(f.file).length, 1)
})
test('distinct tag groups for the same line are preserved', async () => {
  const f = fixture('- [ ] task #todo/a #todo/b')
  f.setMetadata({tags: [tag('#todo/a', 0), tag('#todo/b', 0)]})
  assert.equal((await parse(f)).get(f.file).length, 2)
})
test('current-file filtering tolerates an empty workspace', async () => {
  const f = fixture()
  f.settings.showOnlyActiveFile = true
  await f.view.refresh()
  assert.equal(f.view.groupedItems.length, 0)
})
test('overlapping refresh requests are serialized and retain a requested full scan', async () => {
  const f = fixture()
  let release
  let reads = 0
  f.app.vault.cachedRead = async file => {
    reads++
    if (reads === 1) await new Promise(resolve => (release = resolve))
    return file.content
  }
  const first = f.view.refresh()
  const second = f.view.refresh(true)
  assert.equal(first, second)
  assert.equal(reads, 1)
  release()
  await second
  assert.equal(reads, 2)
  assert.equal(f.view.groupedItems[0].todos.length, 1)
})
test('clicking a task whose source line was deleted is a safe no-op', async () => {
  const f = fixture('')
  await toggleTodoItem(
    {filePath: 'note.md', line: 20, originalText: 'task'},
    f.app,
  )
})

test('nested filters match the exact tag and descendants but not sibling prefixes', async () => {
  const f = fixture(
    '- [ ] exact #todo/next\n- [ ] child #todo/next/errand\n- [ ] sibling #todo/next-week',
  )
  f.settings.todoPageName = ' #TODO/next '
  f.setMetadata({
    tags: [
      tag('#todo/next', 0),
      tag('#todo/next/errand', 1),
      tag('#todo/next-week', 2),
    ],
  })
  await f.view.refresh()
  assert.deepEqual(
    f.view.groupedItems[0].todos.map(t => t.line),
    [0, 1],
  )
  f.settings._hiddenTags = ['todo/next']
  await f.view.refresh(true)
  assert.equal(f.view.groupedItems.length, 0)
})
test('nested frontmatter filters are case insensitive and include descendants', async () => {
  const f = fixture('- [ ] frontmatter task')
  f.settings.todoPageName = 'todo/next'
  f.setMetadata({frontmatter: {tags: ['TODO/Next/Errand']}})
  await f.view.refresh()
  assert.equal(f.view.groupedItems[0].todos.length, 1)
  f.setMetadata({frontmatter: {tags: ['todo/next-week']}})
  await f.view.refresh()
  assert.equal(f.view.groupedItems.length, 0)
})

const TodoPlugin = load('src/main.ts').default
test('plugin unload preserves its workspace leaf for Obsidian to restore', async () => {
  let detached = false
  const plugin = new TodoPlugin()
  plugin.app = {
    workspace: {getLeavesOfType: () => [{detach: () => (detached = true)}]},
  }
  await plugin.onunload()
  assert.equal(detached, false)
})
test('opening the pane reuses an existing restored leaf', async () => {
  const plugin = new TodoPlugin()
  const existing = {}
  const revealed = []
  plugin.app = {
    workspace: {
      getLeavesOfType: () => [existing],
      getRightLeaf: () => assert.fail('must reuse leaf'),
      revealLeaf: async leaf => revealed.push(leaf),
    },
  }
  await plugin.showPane()
  assert.deepEqual(revealed, [existing])
})
test('simultaneous open commands create only one pane', async () => {
  const plugin = new TodoPlugin()
  let creations = 0
  const leaf = {
    setViewState: async () => {
      creations++
    },
  }
  plugin.app = {
    workspace: {
      getLeavesOfType: () => [],
      getRightLeaf: () => leaf,
      revealLeaf: async () => {},
    },
  }
  await Promise.all([plugin.showPane(), plugin.showPane()])
  assert.equal(creations, 1)
})
test('a deferred view is not treated as an initialized checklist', () => {
  const plugin = new TodoPlugin()
  plugin.app = {
    workspace: {
      getLeavesOfType: () => [{view: {getViewType: () => 'deferred'}}],
    },
  }
  assert.equal(plugin.view, undefined)
})

async function pluginFixture() {
  const plugin = new TodoPlugin()
  const commands = []
  let makeView
  plugin.settings = {showOnlyActiveFile: false}
  plugin.loadSettings = async () => {}
  plugin.saveData = async () => {}
  plugin.addSettingTab = () => {}
  plugin.addRibbonIcon = () => {}
  plugin.addCommand = command => commands.push(command)
  plugin.registerEvent = () => {}
  plugin.registerView = (_type, factory) => (makeView = factory)
  const leaves = []
  plugin.app = {
    workspace: {
      getLeavesOfType: () => leaves,
      onLayoutReady: () => {},
      on: () => {},
    },
  }
  await plugin.onload()
  return {plugin, commands, leaves, makeView}
}

test('current-file command toggles and persists even with no checklist pane', async () => {
  const {plugin, commands} = await pluginFixture()
  const saved = []
  plugin.saveData = async data => saved.push(data.showOnlyActiveFile)
  const command = commands.find(command => command.id === 'toggle-current-file')
  await command.callback()
  await command.callback()
  assert.deepEqual(saved, [true, false])
})
test('display changes repaint every initialized pane and skip deferred leaves', async () => {
  const {plugin, leaves, makeView} = await pluginFixture()
  let repaints = 0
  for (let i = 0; i < 2; i++) {
    const view = makeView({app: plugin.app})
    view.rerender = () => repaints++
    leaves.push({view})
  }
  leaves.push({view: {getViewType: () => 'deferred'}})
  await plugin.updateSettings({showSource: false})
  assert.equal(repaints, 2)
})
test('combined display and parsing changes request a full refresh in every pane', async () => {
  const {plugin, leaves, makeView} = await pluginFixture()
  const scans = []
  const view = makeView({app: plugin.app})
  view.refresh = async all => scans.push(all)
  leaves.push({view})
  await plugin.updateSettings({lookAndFeel: 'compact', showAllTodos: true})
  assert.deepEqual(scans, [true])
})

obsidian.Keymap = {isModEvent: () => false}
obsidian.MarkdownView = class {}
const {navToFile} = load('src/utils/files.ts')
test('task navigation positions the cursor on line zero', async () => {
  const f = fixture('- [ ] task')
  const opened = []
  const cursors = []
  const view = new obsidian.MarkdownView()
  const scrolled = []
  view.editor = {
    setCursor: pos => cursors.push(pos.line),
    scrollIntoView: range => scrolled.push(range.from.line),
  }
  f.app.workspace.getLeaf = () => ({
    view,
    openFile: async file => opened.push(file.path),
    setEphemeralState: () => {},
  })
  await navToFile(f.app, 'note.md', {}, 0)
  assert.deepEqual(opened, ['note.md'])
  assert.deepEqual(cursors, [0])
  assert.deepEqual(scrolled, [0])
})

const {buildTodoTree, countTodoTree} = load('src/utils/hierarchy.ts')
const {groupTodos} = load('src/utils/groups.ts')
const {matchesFilePatterns} = load('src/utils/tasks.ts')
function listItem(line, parent = -1, task = ' ') {
  return {position: {start: {line}, end: {line}}, parent, task}
}
function sample(line, parentLine, extra = {}) {
  return {
    filePath: 'note.md',
    fileName: 'note.md',
    fileLabel: 'note',
    line,
    parentLine,
    children: [],
    checked: false,
    originalText: 'Task ' + line,
    sourceLine: '- [ ] Task ' + line,
    fileCreatedTs: 1,
    fileModifiedTs: 1,
    ...extra,
  }
}
test('hierarchy keeps source parents, promotes filtered children, and never mutates cached items', () => {
  const items = [sample(0), sample(2, 0), sample(3, 2)]
  const tree = buildTodoTree(items)
  assert.equal(countTodoTree(tree), 3)
  assert.equal(tree[0].children[0].children[0].line, 3)
  assert.equal(items[0].children.length, 0)
  assert.equal(buildTodoTree(items.slice(1))[0].line, 2)
  assert.equal(buildTodoTree([sample(0, 2), sample(2, 0)]).length, 1)
})
test('tagged parent includes descendants through ordinary list items', async () => {
  const f = fixture(
    '- [ ] Parent #todo\n  - plain bullet\n    - [ ] Child\n- [ ] Other',
  )
  f.setMetadata({
    tags: [tag('#todo', 0)],
    listItems: [
      listItem(0),
      listItem(1, 0, undefined),
      listItem(2, 1),
      listItem(3),
    ],
  })
  const items = (await parse(f)).get(f.file)
  assert.deepEqual(
    items.map(t => t.line),
    [0, 2],
  )
  assert.equal(items[1].parentLine, 0)
  assert.equal('fileInfo' in items[0], false)
})
test('wildcard mode keeps tag groups and excludes fenced examples and properties', async () => {
  const f = fixture(
    '---\ntitle: Example\n---\n```md\n- [ ] fake\n```\n- [ ] tagged #work\n- [ ] untagged',
  )
  f.setMetadata({tags: [tag('#work', 6)]})
  const result = await parseTodos(
    f.files,
    ['*'],
    f.app.metadataCache,
    f.app.vault,
    '',
    true,
    false,
    0,
  )
  assert.deepEqual(
    result.get(f.file).map(t => [t.line, t.mainTag]),
    [
      [6, 'work'],
      [7, undefined],
    ],
  )
})
test('metadata tasks ignore task-like text in code and support plus bullets', async () => {
  const f = fixture('+ [ ] valid #todo\n- [ ] code')
  f.setMetadata({tags: [tag('#todo', 0)], listItems: [listItem(0)]})
  const result = await parseTodos(
    f.files,
    ['*'],
    f.app.metadataCache,
    f.app.vault,
    '',
    true,
    false,
    0,
  )
  assert.deepEqual(
    result.get(f.file).map(t => t.line),
    [0],
  )
})
test('excluded tags hide a subtree or a whole property-tagged note', async () => {
  const f = fixture(
    '- [ ] Parent #todo #archive/later\n  - [ ] Child\n- [ ] Keep #todo',
  )
  f.setMetadata({
    tags: [tag('#todo', 0), tag('#archive/later', 0), tag('#todo', 2)],
    listItems: [listItem(0), listItem(1, 0), listItem(2)],
  })
  const run = () =>
    parseTodos(
      f.files,
      ['todo'],
      f.app.metadataCache,
      f.app.vault,
      '',
      true,
      false,
      0,
      ['archive'],
    )
  assert.deepEqual(
    (await run()).get(f.file).map(t => t.line),
    [2],
  )
  f.setMetadata({frontmatter: {tags: ['todo', 'archive']}})
  assert.equal((await run()).get(f.file).length, 0)
})
test('positive and negative file patterns compose without re-including exclusions', () => {
  assert.equal(
    matchesFilePatterns(
      'Projects/Work.md',
      'Projects/**\n!Projects/Archive/**',
    ),
    true,
  )
  assert.equal(
    matchesFilePatterns(
      'Projects/Archive/Old.md',
      'Projects/**\n!Projects/Archive/**',
    ),
    false,
  )
  assert.equal(matchesFilePatterns('Elsewhere.md', '!Archive/**'), true)
  assert.equal(
    matchesFilePatterns('Archive/Old.md', '!Archive/**\n!Templates/**'),
    false,
  )
})
test('bounded scan isolates failures and retries unreadable files later', async () => {
  const f = fixture()
  f.files.splice(
    0,
    1,
    ...Array.from({length: 24}, (_, i) => new TFile(i + '.md', '- [ ] task')),
  )
  let active = 0,
    peak = 0
  const failures = []
  f.app.vault.cachedRead = async file => {
    active++
    peak = Math.max(peak, active)
    await new Promise(resolve => setTimeout(resolve, 1))
    active--
    if (file.path === '5.md') throw new Error('simulated sync failure')
    return file.content
  }
  const result = await parseTodos(
    f.files,
    ['*'],
    f.app.metadataCache,
    f.app.vault,
    '',
    true,
    false,
    0,
    [],
    file => failures.push(file.path),
  )
  assert.equal(result.size, 23)
  assert.deepEqual(failures, ['5.md'])
  assert.ok(peak <= 4)
  assert.deepEqual(
    [...result.keys()].slice(0, 3).map(f => f.path),
    ['0.md', '1.md', '2.md'],
  )
})
test('atomic toggles preserve CRLF and reject stale source lines', async () => {
  const f = fixture('- [ ] First #todo\r\n- [ ] Second #todo\r\n')
  f.setMetadata({tags: [tag('#todo', 0), tag('#todo', 1)]})
  const items = (await parse(f)).get(f.file)
  await Promise.all(items.map(item => toggleTodoItem(item, f.app)))
  assert.equal(f.file.content, '- [x] First #todo\r\n- [x] Second #todo\r\n')
  const stale = {...items[0], checked: false, sourceLine: '- [ ] First #todo'}
  assert.equal(await toggleTodoItem(stale, f.app), false)
  assert.equal(f.file.content.startsWith('- [x]'), true)
})
test('failed saves do not optimistically change task state', async () => {
  const f = fixture('- [ ] task #todo')
  f.setMetadata({tags: [tag('#todo', 0)]})
  const item = (await parse(f)).get(f.file)[0]
  f.app.vault.process = async (file, update) => {
    update(file.content)
    throw new Error('simulated write failure')
  }
  assert.equal(await toggleTodoItem(item, f.app), false)
  assert.equal(item.checked, false)
})
test('grouping deduplicates page tasks and preserves independent tag trees', () => {
  const items = [
    sample(0, undefined, {mainTag: 'a'}),
    sample(1, 0, {mainTag: 'a'}),
    sample(0, undefined, {mainTag: 'b'}),
  ]
  const pages = groupTodos(items, 'page', 'a->z', 'source', false, 'a->z')
  assert.equal(countTodoTree(pages[0].todos), 2)
  const tags = groupTodos(items, 'tag', 'configured', 'source', true, 'a->z', [
    'b',
    'a',
  ])
  assert.deepEqual(
    tags.map(g => g.label),
    ['#b', '#a'],
  )
  assert.equal(countTodoTree(tags[0].todos), 1)
  assert.equal(countTodoTree(tags[1].todos), 2)
  assert.notEqual(tags[0].groups[0].id, tags[1].groups[0].id)
})
test('modified-time ordering and source ordering keep task trees together', () => {
  const items = [
    sample(10, undefined, {originalText: 'B'}),
    sample(11, 10, {originalText: 'A'}),
    sample(2),
  ]
  const groups = groupTodos(items, 'page', 'modified', 'source', false, 'a->z')
  assert.deepEqual(
    groups[0].todos.map(t => t.line),
    [2, 10],
  )
  assert.equal(groups[0].todos[1].children[0].line, 11)
})
test('view filters and search use cached tasks without reading notes', async () => {
  const f = fixture('- [ ] Open #todo\n- [x] Done #todo')
  f.setMetadata({tags: [tag('#todo', 0), tag('#todo', 1)]})
  await f.view.refresh()
  const reads = f.reads()
  f.settings.showChecked = true
  f.view.regroup()
  assert.equal(f.view.totalCount, 2)
  f.view.props().onSearch('note done')
  assert.equal(f.view.totalCount, 1)
  assert.equal(f.reads(), reads)
})
test('render limit follows source order and load-more reaches all tasks', async () => {
  const f = fixture(
    Array.from({length: 230}, (_, i) => '- [ ] Task ' + i).join('\n'),
  )
  f.settings.todoPageName = ''
  f.settings.sortDirectionItems = 'source'
  f.setMetadata({})
  await f.view.refresh()
  assert.equal(f.view.totalCount, 230)
  assert.equal(countTodoTree(f.view.groupedItems[0].todos), 200)
  assert.equal(f.view.groupedItems[0].todos[199].line, 199)
  f.view.props().onLoadMore()
  assert.equal(countTodoTree(f.view.groupedItems[0].todos), 230)
})
test('deleted files cannot be resurrected by a read already in flight', async () => {
  const f = fixture()
  let release
  f.app.vault.cachedRead = async file => {
    await new Promise(resolve => (release = resolve))
    return file.content
  }
  const refresh = f.view.refresh()
  f.files.length = 0
  release()
  await refresh
  assert.equal(f.view.groupedItems.length, 0)
})
test('loading the plugin registers access controls without creating a pane', async () => {
  const {commands, leaves} = await pluginFixture()
  assert.equal(leaves.length, 0)
  assert.ok(commands.some(command => command.id === 'choose-tag'))
})

test('Tasks integration atomically saves all recurrence lines and passes the source path', async () => {
  const f = fixture('- [ ] Repeat #todo\r\nUnrelated text\r\n')
  f.setMetadata({tags: [tag('#todo', 0)]})
  const item = (await parse(f)).get(f.file)[0]
  f.app.plugins = {
    plugins: {
      'obsidian-tasks-plugin': {
        apiV1: {
          executeToggleTaskDoneCommand: (line, path) => {
            assert.equal(path, 'note.md')
            assert.equal(line, '- [ ] Repeat #todo')
            return '- [x] Repeat #todo ✅ 2026-09-26\n- [ ] Repeat #todo 📅 2026-09-27'
          },
        },
      },
    },
  }
  assert.equal(await toggleTodoItem(item, f.app, true), true)
  assert.equal(
    f.file.content,
    '- [x] Repeat #todo ✅ 2026-09-26\r\n- [ ] Repeat #todo 📅 2026-09-27\r\nUnrelated text\r\n',
  )
})
test('enabled Tasks integration refuses a silent fallback when Tasks is unavailable', async () => {
  const f = fixture('- [ ] Repeat #todo')
  f.setMetadata({tags: [tag('#todo', 0)]})
  const item = (await parse(f)).get(f.file)[0]
  assert.equal(await toggleTodoItem(item, f.app, true), false)
  assert.equal(f.file.content, '- [ ] Repeat #todo')
})

test('focusing a nested configured tag still works when its parent filter is hidden', async () => {
  const f = fixture('- [ ] Next #todo/next\n- [ ] Later #todo/later')
  f.settings.todoPageName = 'todo\ntodo/next'
  f.settings._hiddenTags = ['todo']
  f.setMetadata({tags: [tag('#todo/next', 0), tag('#todo/later', 1)]})
  await f.view.refresh()
  assert.equal(f.view.totalCount, 1)
  assert.equal(f.view.groupedItems[0].todos[0].line, 0)
})
test('whole-note tasks follow tag visibility even without their own inline tags', async () => {
  const f = fixture('#work\n\n- [ ] Whole note task')
  f.settings.todoPageName = 'work\nother'
  f.settings.showAllTodos = true
  f.settings._hiddenTags = ['work']
  f.setMetadata({tags: [tag('#work', 0)]})
  await f.view.refresh()
  assert.equal(f.view.totalCount, 0)
})
test('wiki link attributes are escaped and links remain keyboard accessible', async () => {
  const f = fixture('- [ ] Read [[Note|the note]] #todo')
  f.setMetadata({
    tags: [tag('#todo', 0)],
    links: [
      {
        link: 'Note',
        displayText: 'the note',
        position: {start: {line: 0}, end: {line: 0}},
      },
    ],
  })
  const item = (await parse(f)).get(f.file)[0]
  assert.match(item.rawHTML, /href="#"/)
  assert.match(item.rawHTML, /data-filepath="Note"/)
  assert.match(item.rawHTML, />the note<\/a>/)
})

test('ungrouped tasks deduplicate tags, retain children, and honor task sorting', () => {
  const items = [
    sample(3, undefined, {mainTag: 'a'}),
    sample(4, 3),
    sample(3, undefined, {mainTag: 'b'}),
    sample(0),
  ]
  const groups = groupTodos(items, 'none', 'a->z', 'source', true, 'a->z')
  assert.equal(groups.length, 1)
  assert.equal(groups[0].type, 'none')
  assert.equal(groups[0].groups, undefined)
  assert.deepEqual(
    groups[0].todos.map(t => t.line),
    [0, 3],
  )
  assert.equal(countTodoTree(groups[0].todos), 3)
  assert.equal(groups[0].todos[1].children[0].line, 4)
  assert.deepEqual(groupTodos([], 'none', 'a->z', 'source', true, 'a->z'), [])
})

test('defaults preserve legacy organization and upgrades retain saved choices', async () => {
  const {DEFAULT_SETTINGS} = load('src/settings.ts')
  assert.equal(DEFAULT_SETTINGS.groupBy, 'page')
  assert.equal(DEFAULT_SETTINGS.subGroups, false)
  assert.equal(DEFAULT_SETTINGS.showSource, false)
  assert.equal(DEFAULT_SETTINGS.useTasksPlugin, false)
  for (const key of [
    'sortDirectionItems',
    'sortDirectionGroups',
    'sortDirectionSubGroups',
  ])
    assert.equal(DEFAULT_SETTINGS[key], 'new->old')
  const plugin = new TodoPlugin()
  plugin.loadData = async () => ({
    groupBy: 'tag',
    subGroups: false,
    sortDirectionItems: 'old->new',
  })
  await plugin.loadSettings()
  assert.equal(plugin.getSettingValue('groupBy'), 'tag')
  assert.equal(plugin.getSettingValue('subGroups'), false)
  assert.equal(plugin.getSettingValue('sortDirectionItems'), 'old->new')
  assert.equal(plugin.getSettingValue('showSource'), false)
})
