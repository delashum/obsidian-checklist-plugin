import {Plugin} from 'obsidian'

import {TODO_VIEW_TYPE} from './constants'
import {DEFAULT_SETTINGS, TodoSettings, TodoSettingTab} from './settings'
import TodoListView from './view'

export default class TodoPlugin extends Plugin {
  settings: TodoSettings
  view: TodoListView

  async onload() {
    await this.loadSettings()

    this.addSettingTab(new TodoSettingTab(this.app, this))
    this.registerView(TODO_VIEW_TYPE, (leaf) => {
      this.view = new TodoListView(leaf, this.settings)
      return this.view
    })

    if (this.app.workspace.layoutReady) this.initLeaf()
    else this.registerEvent(this.app.workspace.on("layout-ready", this.initLeaf.bind(this)))
  }

  initLeaf(): void {
    if (this.app.workspace.getLeavesOfType(TODO_VIEW_TYPE).length) return

    this.app.workspace.getRightLeaf(true).setViewState({
      type: TODO_VIEW_TYPE,
      active: false,
    })
  }

  onunload() {
    this.view.onDestroy()
  }

  async loadSettings() {
    this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }
}
