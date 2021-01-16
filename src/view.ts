import { ItemView, WorkspaceLeaf } from "obsidian"

import { TODO_VIEW_TYPE } from "./constants"
import App from "./svelte/App.svelte"

import type { TodoSettings } from "./settings"
export default class TodoListView extends ItemView {
  private settings: TodoSettings
  private _app: App

  constructor(leaf: WorkspaceLeaf, settings: TodoSettings) {
    super(leaf)

    this.settings = settings
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

  async onOpen(): Promise<void> {
    this._app = new App({
      target: (this as any).contentEl,
      props: {
        todoTag: this.settings.todoPageName,
        showChecked: this.settings.showChecked,
        groupBy: this.settings.groupBy,
        sortDirection: this.settings.sortDirection,
      },
    })
    this.registerEvent(this.app.vault.on("modify", this.rerender.bind(this)))
    this.registerEvent(this.app.workspace.on("file-open", this.rerender.bind(this)))
  }

  rerender() {
    this._app.$set({
      todoTag: this.settings.todoPageName,
      showChecked: this.settings.showChecked,
      groupBy: this.settings.groupBy,
      sortDirection: this.settings.sortDirection,
      rerenderKey: Symbol("[rerender]"),
    })
  }
}
