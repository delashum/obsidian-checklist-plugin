import {ItemView, WorkspaceLeaf} from 'obsidian'

import {TODO_VIEW_TYPE} from './constants'
import App from './svelte/App.svelte'
import {groupTodos, parseTodos} from './utils'

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
    return 'Todo List'
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
    this._app?.$destroy()
  }

  async onOpen(): Promise<void> {
    this.closed = false
    this._app = new App({
      target: (this as any).contentEl,
      props: this.props(),
    })
    this.registerEvent(
      this.app.metadataCache.on('resolved', async () => {
        if (!this.plugin.getSettingValue('autoRefresh')) return
        await this.refresh()
      }),
    )
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', async () => {
        if (!this.plugin.getSettingValue('showOnlyActiveFile')) return
        await this.refresh()
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
    while (this.refreshRequested && !this.closed) {
      const all = this.fullRefreshRequested
      this.refreshRequested = false
      this.fullRefreshRequested = false
      await this.refreshOnce(all)
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
      lookAndFeel: this.plugin.getSettingValue('lookAndFeel'),
      subGroups: this.plugin.getSettingValue('subGroups'),
      _collapsedSections: this.plugin.getSettingValue('_collapsedSections'),
      _hiddenTags: this.plugin.getSettingValue('_hiddenTags'),
      app: this.app,
      todoGroups: this.groupedItems,
      updateSetting: (updates: Partial<TodoSettings>) =>
        this.plugin.updateSettings(updates),
      onSearch: (val: string) => {
        this.searchTerm = val
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
      this.todoTagArray.length === 0 ? ['*'] : this.visibleTodoTagArray,
      this.app.metadataCache,
      this.app.vault,
      this.plugin.getSettingValue('includeFiles'),
      this.plugin.getSettingValue('showChecked'),
      this.plugin.getSettingValue('showAllTodos'),
      0,
    )
    for (const [file, todos] of todosForUpdatedFiles) {
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
    const searchedItems = filteredItems.filter(e =>
      e.originalText.toLowerCase().includes(this.searchTerm.toLowerCase()),
    )
    this.groupedItems = groupTodos(
      searchedItems,
      this.plugin.getSettingValue('groupBy'),
      this.plugin.getSettingValue('sortDirectionGroups'),
      this.plugin.getSettingValue('sortDirectionItems'),
      this.plugin.getSettingValue('subGroups'),
      this.plugin.getSettingValue('sortDirectionSubGroups'),
    )
  }

  private renderView() {
    if (!this.closed) this._app?.$set(this.props())
  }
}
