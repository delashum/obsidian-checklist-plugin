import {ItemView, WorkspaceLeaf} from 'obsidian'

import {TODO_VIEW_TYPE} from './constants'
import App from './svelte/App.svelte'

import type { TodoSettings } from "./settings"
import type TodoPlugin from "./main"
export default class TodoListView extends ItemView {
  private _app: App

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

  async onClose() {
    this._app.$destroy()
  }

  private getProps() {
    return {
      todoTag: this.plugin.getSettingValue("todoPageName"),
      showChecked: this.plugin.getSettingValue("showChecked"),
      groupBy: this.plugin.getSettingValue("groupBy"),
      sortDirection: this.plugin.getSettingValue("sortDirection"),
      ignoreFiles: this.plugin.getSettingValue("ignoreFiles"),
      lookAndFeel: this.plugin.getSettingValue("lookAndFeel"),
      rerenderKey: Symbol("[rerender]"),
      _collapsedSections: this.plugin.getSettingValue("_collapsedSections"),
      app: this.app,
      updateSetting: (updates: Partial<TodoSettings>) => this.plugin.updateSettings(updates),
    }
  }

  async onOpen(): Promise<void> {
    this._app = new App({
      target: (this as any).contentEl,
      props: this.getProps(),
    })
    this.registerEvent(
      this.app.metadataCache.on("resolve", (...args) => {
        // TODO: capture incremental updates here
        this.rerender()
      })
    )
  }

  rerender() {
    this._app.$set(this.getProps())
  }
}
