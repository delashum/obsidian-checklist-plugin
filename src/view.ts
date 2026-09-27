import {ItemView, WorkspaceLeaf} from 'obsidian'

import {TODO_VIEW_TYPE} from './constants'
import App from './svelte/App.svelte'
import {groupTodos, parseTodos} from './utils'
import {matchesTodoTag} from './utils/helpers'

import type {TodoSettings} from './settings'
import type TodoPlugin from './main'
import type {TodoGroup, TodoItem} from './_types'
export default class TodoListView extends ItemView {
  private _app: App
  private fileVersions = new Map<string, {mtime: number; cache: unknown}>()
  private refreshPromise: Promise<void> | null = null
  private refreshRequested = false
  private fullRefreshRequested = false
  private closed = false
  private groupedItems: TodoGroup[] = []
  private itemsByFile = new Map<string, TodoItem[]>()
  private searchTerm = ''
  private visibleLimit = 200
  private totalCount = 0
  private loading = false
  private failedFiles = new Set<string>()
  private refreshTimer: number

  constructor(
    leaf: WorkspaceLeaf,
    private plugin: TodoPlugin,
  ) {
    super(leaf)
  }

  getViewType(): string {
    return TODO_VIEW_TYPE
  }

  getDisplayText(): string {
    return 'Checklist'
  }

  getIcon(): string {
    return 'checkmark'
  }

  get todoTagArray() {
    return this.plugin
      .getSettingValue('todoPageName')
      .trim()
      .split('\n')
      .map(e => e.trim().replace(/^#/, '').toLowerCase())
      .filter(e => e)
  }

  get visibleTodoTagArray() {
    return this.todoTagArray.filter(
      t => !this.plugin.getSettingValue('_hiddenTags').includes(t),
    )
  }

  async onClose() {
    this.closed = true
    window.clearTimeout(this.refreshTimer)
    this._app?.$destroy()
  }

  async onOpen(): Promise<void> {
    this.closed = false
    this._app = new App({
      target: (this as any).contentEl,
      props: this.props(),
    })
    this.registerEvent(
      this.app.metadataCache.on('resolved', () => this.scheduleRefresh()),
    )
    this.registerEvent(
      this.app.metadataCache.on('changed', file => {
        this.fileVersions.delete(file.path)
        this.scheduleRefresh()
      }),
    )
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', async () => {
        if (!this.plugin.getSettingValue('showOnlyActiveFile')) return
        this.regroup()
      }),
    )
    this.registerEvent(
      this.app.vault.on('delete', file => this.deleteFile(file.path)),
    )
    this.registerEvent(
      this.app.vault.on('rename', () => {
        if (this.plugin.getSettingValue('autoRefresh')) void this.refresh()
      }),
    )
    await this.refresh()
  }

  private scheduleRefresh() {
    if (!this.plugin.getSettingValue('autoRefresh')) return
    window.clearTimeout(this.refreshTimer)
    this.refreshTimer = window.setTimeout(() => void this.refresh(), 250)
  }

  regroup() {
    this.visibleLimit = 200
    this.groupItems()
    this.renderView()
  }

  refresh(all = false): Promise<void> {
    this.refreshRequested = true
    this.fullRefreshRequested ||= all
    if (!this.refreshPromise) {
      this.refreshPromise = this.runRefreshes().finally(() => {
        this.refreshPromise = null
      })
    }
    return this.refreshPromise
  }

  private async runRefreshes() {
    this.loading = true
    this.renderView()
    try {
      while (this.refreshRequested && !this.closed) {
        const all = this.fullRefreshRequested
        this.refreshRequested = false
        this.fullRefreshRequested = false
        await this.refreshOnce(all)
      }
    } finally {
      this.loading = false
      this.renderView()
    }
  }

  private async refreshOnce(all: boolean) {
    if (all) {
      this.fileVersions.clear()
      this.itemsByFile.clear()
    }
    await this.calculateAllItems()
    if (this.closed) return
    this.groupItems()
    this.renderView()
  }

  rerender() {
    this.renderView()
  }

  private deleteFile(path: string) {
    this.itemsByFile.delete(path)
    this.fileVersions.delete(path)
    this.groupItems()
    this.renderView()
  }

  private props() {
    return {
      todoTags: this.todoTagArray,
      groupBy: this.plugin.getSettingValue('groupBy'),
      showChecked: this.plugin.getSettingValue('showChecked'),
      showOnlyActiveFile: this.plugin.getSettingValue('showOnlyActiveFile'),
      showGroupCounts: this.plugin.getSettingValue('showGroupCounts'),
      showSource: this.plugin.getSettingValue('showSource'),
      useTasksPlugin: this.plugin.getSettingValue('useTasksPlugin'),
      subGroupBy: this.plugin.getSettingValue('subGroupBy') ?? 'none',
      nestSubtasks: this.plugin.getSettingValue('nestSubtasks') ?? false,
      sortDirectionGroups: this.plugin.getSettingValue('sortDirectionGroups'),
      sortDirectionItems: this.plugin.getSettingValue('sortDirectionItems'),
      focusFolder: this.plugin.getSettingValue('focusFolder'),
      totalCount: this.totalCount,
      hasMore: this.totalCount > this.visibleLimit,
      loading: this.loading,
      failedCount: this.failedFiles.size,
      onLoadMore: () => {
        this.visibleLimit += 200
        this.groupItems()
        this.renderView()
      },
      onRefresh: () => this.refresh(true),
      onTaskChanged: (path: string) => {
        this.fileVersions.delete(path)
        return this.refresh()
      },
      _collapsedSections: this.plugin.getSettingValue('_collapsedSections'),
      _hiddenTags: this.plugin.getSettingValue('_hiddenTags'),
      app: this.app,
      todoGroups: this.groupedItems,
      updateSetting: (updates: Partial<TodoSettings>) =>
        this.plugin.updateSettings(updates),
      onSearch: (val: string) => {
        this.searchTerm = val
        this.visibleLimit = 200
        this.groupItems()
        this.renderView()
      },
    }
  }

  private async calculateAllItems() {
    const files = this.app.vault.getMarkdownFiles()
    const paths = new Set(files.map(file => file.path))
    for (const path of this.itemsByFile.keys()) {
      if (!paths.has(path)) {
        this.itemsByFile.delete(path)
        this.fileVersions.delete(path)
      }
    }
    // Metadata may resolve after mtime changes, so compare both rather than
    // comparing file timestamps to the wall-clock time of the previous scan.
    const versions = new Map(
      files.map(file => [
        file.path,
        {
          mtime: file.stat.mtime,
          cache: this.app.metadataCache.getFileCache(file),
        },
      ]),
    )
    const changedFiles = files.filter(file => {
      const previous = this.fileVersions.get(file.path)
      const current = versions.get(file.path)
      return (
        !previous ||
        previous.mtime !== current.mtime ||
        previous.cache !== current.cache
      )
    })
    const todosForUpdatedFiles = await parseTodos(
      changedFiles,
      this.todoTagArray.length === 0 ? ['*'] : this.todoTagArray,
      this.app.metadataCache,
      this.app.vault,
      this.plugin.getSettingValue('includeFiles'),
      true,
      this.plugin.getSettingValue('showAllTodos'),
      0,
      (this.plugin.getSettingValue('excludeTags') ?? '')
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean),
      file => this.failedFiles.add(file.path),
      this.plugin.getSettingValue('nestSubtasks') ?? false,
    )
    const currentPaths = new Set(
      this.app.vault.getMarkdownFiles().map(file => file.path),
    )
    for (const path of this.failedFiles)
      if (!currentPaths.has(path)) this.failedFiles.delete(path)
    for (const [file, todos] of todosForUpdatedFiles) {
      this.failedFiles.delete(file.path)
      // A file may have been deleted or renamed while its read was in flight.
      if (!currentPaths.has(file.path) || !versions.has(file.path)) continue
      this.itemsByFile.set(file.path, todos)
      this.fileVersions.set(file.path, versions.get(file.path))
    }
  }

  private groupItems() {
    const flattenedItems = Array.from(this.itemsByFile.values()).flat()
    const viewOnlyOpen = this.plugin.getSettingValue('showOnlyActiveFile')
    const openFile = this.app.workspace.getActiveFile()
    const filteredItems = viewOnlyOpen
      ? flattenedItems.filter(i => i.filePath === openFile?.path)
      : flattenedItems
    const folder = (this.plugin.getSettingValue('focusFolder') ?? '')
      .trim()
      .replace(/^\/+|\/+$/g, '')
    const terms = this.searchTerm
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean)
    const searchedItems = filteredItems.filter(item => {
      if (!this.plugin.getSettingValue('showChecked') && item.checked)
        return false
      if (folder && !item.filePath.startsWith(folder + '/')) return false
      if (this.todoTagArray.length && !this.visibleTodoTagArray.length)
        return false
      if (
        this.todoTagArray.length &&
        !item.filterTags.some(tag =>
          matchesTodoTag(tag, this.visibleTodoTagArray),
        )
      )
        return false
      const text = `${item.originalText} ${item.filePath} ${
        item.mainTag ?? ''
      }/${item.subTag ?? ''}`.toLowerCase()
      return terms.every(term => text.includes(term))
    })
    this.totalCount = new Set(
      searchedItems.map(item => JSON.stringify([item.filePath, item.line])),
    ).size
    const groups = groupTodos(
      searchedItems,
      this.plugin.getSettingValue('groupBy'),
      this.plugin.getSettingValue('sortDirectionGroups'),
      this.plugin.getSettingValue('sortDirectionItems'),
      this.plugin.getSettingValue('subGroupBy') ?? 'none',
      this.plugin.getSettingValue('sortDirectionSubGroups'),
      this.todoTagArray,
      '',
      this.plugin.getSettingValue('nestSubtasks') ?? false,
    )
    // Apply the render limit after sorting; always admit parents before children.
    const admitted = new Set<string>()
    const admitTree = (items: TodoItem[]) => {
      for (const item of items) {
        if (admitted.size < this.visibleLimit)
          admitted.add(JSON.stringify([item.filePath, item.line]))
        admitTree(item.children)
      }
    }
    const admitGroups = (groups: TodoGroup[]) => {
      for (const group of groups) {
        if (group.groups) admitGroups(group.groups)
        else admitTree(group.todos)
      }
    }
    admitGroups(groups)
    const pruneTree = (items: TodoItem[]): TodoItem[] =>
      items
        .filter(item =>
          admitted.has(JSON.stringify([item.filePath, item.line])),
        )
        .map(item => ({...item, children: pruneTree(item.children)}))
    const pruneGroups = (groups: TodoGroup[]): TodoGroup[] =>
      groups
        .map(group => ({
          ...group,
          todos: pruneTree(group.todos),
          groups: group.groups ? pruneGroups(group.groups) : undefined,
        }))
        .filter(group => group.todos.length)
    this.groupedItems = pruneGroups(groups)
  }

  private renderView() {
    if (!this.closed) this._app?.$set(this.props())
  }
}
