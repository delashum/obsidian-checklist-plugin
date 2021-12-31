import {ItemView, WorkspaceLeaf} from 'obsidian'

import {TODO_VIEW_TYPE} from './constants'
import App from './svelte/App.svelte'
import {groupTodos, parseTodos} from './utils'

import type { TodoSettings } from "./settings"
import type TodoPlugin from "./main"
import type { TodoGroup, TodoItem } from "./_types"
export default class TodoListView extends ItemView {
  private _app: App
  private lastRerender = 0
  private groupedItems: TodoGroup[] = []
  private itemsByFile = new Map<string, TodoItem[]>()
  private initialLoad = true
  private searchTerm = ""

  constructor(leaf: WorkspaceLeaf, private plugin: TodoPlugin) {
    super(leaf)
  }

  getViewType(): string {
    return TODO_VIEW_TYPE
  }

  getDisplayText(): string {
    return "Todo List"
  }

  getIcon(): string {
    return "checkmark"
  }

  get todoTagArray() {
    return this.plugin
      .getSettingValue("todoPageName")
      .trim()
      .split("\n")
      .map((e) => e.toLowerCase())
      .filter((e) => e)
  }

  get visibleTodoTagArray() {
    return this.todoTagArray.filter((t) => !this.plugin.getSettingValue("_hiddenTags").includes(t))
  }

  async onClose() {
    this._app.$destroy()
  }

  async onOpen(): Promise<void> {
    this._app = new App({
      target: (this as any).contentEl,
      props: this.props(),
    })
    this.registerEvent(
      this.app.metadataCache.on("resolved", async () => {
        if (!this.plugin.getSettingValue("autoRefresh") && !this.initialLoad) return
        if (this.initialLoad) this.initialLoad = false
        await this.refresh()
      })
    )
    this.registerEvent(this.app.vault.on("delete", (file) => this.deleteFile(file.path)))
  }

  async refresh(all = false) {
    if (all) {
      this.lastRerender = 0
      this.itemsByFile.clear()
    }
    await this.calculateAllItems()
    this.groupItems()
    this.renderView()
    this.lastRerender = +new Date()
  }

  rerender() {
    this.renderView()
  }

  private deleteFile(path: string) {
    this.itemsByFile.delete(path)
    this.groupItems()
    this.renderView()
  }

  private props() {
    return {
      todoTags: this.todoTagArray,
      lookAndFeel: this.plugin.getSettingValue("lookAndFeel"),
      subGroups: this.plugin.getSettingValue("subGroups"),
      _collapsedSections: this.plugin.getSettingValue("_collapsedSections"),
      _hiddenTags: this.plugin.getSettingValue("_hiddenTags"),
      app: this.app,
      todoGroups: this.groupedItems,
      initialLoad: this.initialLoad,
      updateSetting: (updates: Partial<TodoSettings>) => this.plugin.updateSettings(updates),
      onSearch: (val: string) => {
        this.searchTerm = val
        this.refresh()
      },
    }
  }

  private async calculateAllItems() {
    const items = await parseTodos(
      this.app.vault.getFiles(),
      this.todoTagArray.length === 0 ? ["*"] : this.visibleTodoTagArray,
      this.app.metadataCache,
      this.app.vault,
      this.plugin.getSettingValue("includeFiles"),
      this.plugin.getSettingValue("showChecked"),
      this.lastRerender
    )
    const changesMap = new Map<string, TodoItem[]>()
    for (const item of items) {
      if (!changesMap.has(item.filePath)) changesMap.set(item.filePath, [])
      changesMap.get(item.filePath).push(item)
    }
    for (const [path, pathItems] of changesMap) this.itemsByFile.set(path, pathItems)
  }

  private groupItems() {
    const flattenedItems = Array.from(this.itemsByFile.values()).flat()
    const searchedItems = flattenedItems.filter((e) => e.originalText.toLowerCase().includes(this.searchTerm))
    this.groupedItems = groupTodos(
      searchedItems,
      this.plugin.getSettingValue("groupBy"),
      this.plugin.getSettingValue("sortDirectionGroups"),
      this.plugin.getSettingValue("sortDirectionItems"),
      this.plugin.getSettingValue("subGroups"),
      this.plugin.getSettingValue("sortDirectionSubGroups")
    )
  }

  private renderView() {
    this._app.$set(this.props())
  }
}
