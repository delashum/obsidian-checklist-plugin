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
test('initializing an existing pane never creates a duplicate or changes focus', () => {
  const plugin = new TodoPlugin()
  plugin.app = {
    workspace: {
      getLeavesOfType: () => [{}],
      getRightLeaf: () => assert.fail('must reuse existing leaf'),
    },
  }
  plugin.initLeaf()
})
test('initializing a new pane does not activate it', () => {
  const states = []
  const plugin = new TodoPlugin()
  plugin.app = {
    workspace: {
      getLeavesOfType: () => [],
      getRightLeaf: () => ({setViewState: state => states.push(state)}),
    },
  }
  plugin.initLeaf()
  assert.equal(states[0].active, false)
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
  plugin.addCommand = command => commands.push(command)
  plugin.registerView = (_type, factory) => (makeView = factory)
  const leaves = []
  plugin.app = {
    workspace: {getLeavesOfType: () => leaves, onLayoutReady: () => {}},
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
  await plugin.updateSettings({lookAndFeel: 'compact', showChecked: true})
  assert.deepEqual(scans, [true])
})

obsidian.Keymap = {isModEvent: () => false}
obsidian.MarkdownView = class {}
const {navToFile} = load('src/utils/files.ts')
test('task navigation positions the cursor on line zero', async () => {
  const f = fixture('- [ ] task')
  const opened = []
  const cursors = []
  f.app.workspace.getLeaf = () => ({
    openFile: async file => opened.push(file.path),
  })
  f.app.workspace.getActiveViewOfType = () => ({
    editor: {setCursor: line => cursors.push(line)},
  })
  await navToFile(f.app, 'note.md', {}, 0)
  assert.deepEqual(opened, ['note.md'])
  assert.deepEqual(cursors, [0])
})
