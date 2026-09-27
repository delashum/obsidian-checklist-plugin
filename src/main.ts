import {Plugin, FuzzySuggestModal, TFolder} from 'obsidian'

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
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (!(file instanceof TFolder)) return
        menu.addItem(item =>
          item
            .setTitle('Focus Checklist on this folder')
            .setIcon('list-checks')
            .onClick(async () => {
              await this.updateSettings({
                focusFolder: file.path === '/' ? '' : file.path,
                showOnlyActiveFile: false,
              })
              await this.showPane()
            }),
        )
      }),
    )
    this.addRibbonIcon(
      'list-checks',
      'Open Checklist',
      () => void this.showPane(),
    )
    this.addCommand({
      id: 'show-checklist-view',
      name: 'Show Checklist pane',
      callback: () => this.showPane(),
    })
    this.addCommand({
      id: 'choose-tag',
      name: 'Focus a tag',
      callback: () => new TagPicker(this).open(),
    })
    this.addCommand({
      id: 'toggle-completed',
      name: 'Toggle completed tasks',
      callback: () =>
        this.updateSettings({showChecked: !this.settings.showChecked}),
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

    // Registered panes restore in place. Create a new pane only on explicit use;
    // a plugin reload can run before Obsidian finishes restoring existing leaves.
  }

  private openingPane: Promise<void> | null = null
  showPane(): Promise<void> {
    if (this.openingPane) return this.openingPane
    this.openingPane = (async () => {
      const workspace = this.app.workspace
      const existing = workspace.getLeavesOfType(TODO_VIEW_TYPE)[0]
      const leaf =
        existing ?? workspace.getRightLeaf(false) ?? workspace.getLeaf(true)
      if (!existing)
        await leaf.setViewState({type: TODO_VIEW_TYPE, active: true})
      await workspace.revealLeaf(leaf)
    })().finally(() => {
      this.openingPane = null
    })
    return this.openingPane
  }

  // Obsidian restores registered views in place across plugin reloads.
  // Detaching leaves on unload would discard the user's pane position.

  async loadSettings() {
    const loadedData = await this.loadData()
    this.settings = {...DEFAULT_SETTINGS, ...loadedData}
    if (loadedData?.subGroupBy == null && loadedData?.subGroups)
      this.settings.subGroupBy =
        this.settings.groupBy === 'page' ? 'tag' : 'page'
    if (
      this.settings.groupBy === 'none' ||
      this.settings.groupBy === this.settings.subGroupBy
    )
      this.settings.subGroupBy = 'none'
    this.settings.subGroups = this.settings.subGroupBy !== 'none'
  }

  async updateSettings(updates: Partial<TodoSettings>) {
    updates = {...updates}
    if (updates.groupBy === 'none') updates.subGroupBy = 'none'
    else if (updates.groupBy && updates.groupBy === this.settings.subGroupBy)
      updates.subGroupBy = this.settings.groupBy
    else if (
      updates.subGroupBy &&
      updates.subGroupBy !== 'none' &&
      updates.subGroupBy === this.settings.groupBy
    ) {
      if (this.settings.subGroupBy !== 'none')
        updates.groupBy = this.settings.subGroupBy
      else updates.subGroupBy = 'none'
    }
    if (updates.subGroupBy != null)
      updates.subGroups = updates.subGroupBy !== 'none'
    Object.assign(this.settings, updates)
    await this.saveData(this.settings)
    const onlyRepaintWhenChanges = [
      'autoRefresh',
      'useTasksPlugin',
      'showSource',
      'showGroupCounts',
      '_collapsedSections',
    ]
    const onlyReGroupWhenChanges = [
      'subGroups',
      'subGroupBy',
      'groupBy',
      'sortDirectionGroups',
      'sortDirectionSubGroups',
      'sortDirectionItems',
      'showChecked',
      'showOnlyActiveFile',
      'focusFolder',
      '_hiddenTags',
    ]
    const keys = Object.keys(updates)
    if (keys.every(key => onlyRepaintWhenChanges.includes(key)))
      this.views.forEach(view => view.rerender())
    else if (
      keys.every(
        key =>
          onlyReGroupWhenChanges.includes(key) ||
          onlyRepaintWhenChanges.includes(key),
      )
    )
      this.views.forEach(view => view.regroup())
    else await Promise.all(this.views.map(view => view.refresh(true)))
  }

  getSettingValue<K extends keyof TodoSettings>(setting: K): TodoSettings[K] {
    return this.settings[setting]
  }
}

class TagPicker extends FuzzySuggestModal<string> {
  constructor(private plugin: TodoPlugin) {
    super(plugin.app)
    this.setPlaceholder('Focus a tag…')
  }
  getItems() {
    return [
      'All configured tags',
      ...this.plugin
        .getSettingValue('todoPageName')
        .split('\n')
        .map(t => t.trim().replace(/^#/, '').toLowerCase())
        .filter(Boolean),
    ]
  }
  getItemText(item: string) {
    return item === 'All configured tags' ? item : '#' + item
  }
  onChooseItem(item: string) {
    const tags = this.getItems().slice(1)
    void this.plugin.updateSettings({
      _hiddenTags:
        item === 'All configured tags' ? [] : tags.filter(t => t !== item),
    })
    void this.plugin.showPane()
  }
}
