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
  Plugin: class {},
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
