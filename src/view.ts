import {ItemView, WorkspaceLeaf} from 'obsidian'

import {TODO_VIEW_TYPE} from './constants'
import App from './svelte/App.svelte'

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

  onDestroy() {
    this._app.$destroy()
  }

  async onClose(): Promise<void> {}

  async onOpen(): Promise<void> {
    this._app = new App({
      target: (this as any).contentEl,
      props: {
        todoLinkId: this.settings.todoPageName,
      },
    })
  }
}
