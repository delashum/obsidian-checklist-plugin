import {Plugin} from 'obsidian'

import {TODO_VIEW_TYPE} from './constants'
import {DEFAULT_SETTINGS, TodoSettings, TodoSettingTab} from './settings'
import TodoListView from './view'

export default class TodoPlugin extends Plugin {
  private settings: TodoSettings

  get views(): TodoListView[] {
    return this.app.workspace
      .getLeavesOfType(TODO_VIEW_TYPE)
      .map(leaf => leaf.view)
      .filter((view): view is TodoListView => view instanceof TodoListView)
  }

  get view() {
    return this.views[0]
  }

  async onload() {
    await this.loadSettings()

    this.addSettingTab(new TodoSettingTab(this.app, this))
    this.addCommand({
      id: 'show-checklist-view',
      name: 'Show Checklist Pane',
      callback: () => {
        const workspace = this.app.workspace
        const views = workspace.getLeavesOfType(TODO_VIEW_TYPE)
        if (views.length === 0) {
          workspace
            .getRightLeaf(false)
            .setViewState({
              type: TODO_VIEW_TYPE,
              active: true,
            })
            .then(() => {
              const todoLeaf = workspace.getLeavesOfType(TODO_VIEW_TYPE)[0]
              workspace.revealLeaf(todoLeaf)
              workspace.setActiveLeaf(todoLeaf, true, true)
            })
        } else {
          views[0].setViewState({
            active: true,
            type: TODO_VIEW_TYPE,
          })
          workspace.revealLeaf(views[0])
          workspace.setActiveLeaf(views[0], true, true)
        }
      },
    })
    this.addCommand({
      id: 'refresh-checklist-view',
      name: 'Refresh List',
      callback: () => {
        this.views.forEach(view => void view.refresh(true))
      },
    })
    this.addCommand({
      id: 'toggle-current-file',
      name: 'Toggle current file only',
      callback: () =>
        this.updateSettings({
          showOnlyActiveFile: !this.getSettingValue('showOnlyActiveFile'),
        }),
    })
    this.registerView(TODO_VIEW_TYPE, leaf => {
      const newView = new TodoListView(leaf, this)
      return newView
    })

    this.app.workspace.onLayoutReady(() => this.initLeaf())
  }

  initLeaf(): void {
    if (this.app.workspace.getLeavesOfType(TODO_VIEW_TYPE).length) return

    this.app.workspace.getRightLeaf(false)?.setViewState({
      type: TODO_VIEW_TYPE,
      active: false,
    })
  }

  // Obsidian restores registered views in place across plugin reloads.
  // Detaching leaves on unload would discard the user's pane position.

  async loadSettings() {
    const loadedData = await this.loadData()
    this.settings = {...DEFAULT_SETTINGS, ...loadedData}
  }

  async updateSettings(updates: Partial<TodoSettings>) {
    Object.assign(this.settings, updates)
    await this.saveData(this.settings)
    const onlyRepaintWhenChanges = [
      'autoRefresh',
      'lookAndFeel',
      'showSource',
      '_collapsedSections',
    ]
    const onlyReGroupWhenChanges = [
      'subGroups',
      'groupBy',
      'sortDirectionGroups',
      'sortDirectionSubGroups',
      'sortDirectionItems',
    ]
    const keys = Object.keys(updates)
    if (keys.every(key => onlyRepaintWhenChanges.includes(key)))
      this.views.forEach(view => view.rerender())
    else
      await Promise.all(
        this.views.map(view =>
          view.refresh(
            !keys.every(
              key =>
                onlyReGroupWhenChanges.includes(key) ||
                onlyRepaintWhenChanges.includes(key),
            ),
          ),
        ),
      )
  }

  getSettingValue<K extends keyof TodoSettings>(setting: K): TodoSettings[K] {
    return this.settings[setting]
  }
}
