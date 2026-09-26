import {App, PluginSettingTab, Setting} from 'obsidian'
import type TodoPlugin from './main'
import type {GroupByType, LookAndFeel, SortDirection} from './_types'

export interface TodoSettings {
  todoPageName: string
  excludeTags: string
  focusFolder: string
  useTasksPlugin: boolean
  showSource: boolean
  showChecked: boolean
  showAllTodos: boolean
  showOnlyActiveFile: boolean
  autoRefresh: boolean
  groupBy: GroupByType
  subGroups: boolean
  sortDirectionItems: SortDirection
  sortDirectionGroups: SortDirection
  sortDirectionSubGroups: SortDirection
  includeFiles: string
  lookAndFeel: LookAndFeel
  _collapsedSections: string[]
  _hiddenTags: string[]
}
export const DEFAULT_SETTINGS: TodoSettings = {
  todoPageName: 'todo',
  useTasksPlugin: false,
  excludeTags: '',
  focusFolder: '',
  showSource: true,
  showChecked: false,
  showAllTodos: false,
  showOnlyActiveFile: false,
  autoRefresh: true,
  subGroups: false,
  groupBy: 'page',
  sortDirectionItems: 'source',
  sortDirectionGroups: 'a->z',
  sortDirectionSubGroups: 'a->z',
  includeFiles: '',
  lookAndFeel: 'classic',
  _collapsedSections: [],
  _hiddenTags: [],
}
export const SORT_OPTIONS = {
  'a->z': 'Name A–Z',
  'z->a': 'Name Z–A',
  'new->old': 'Newest created',
  'old->new': 'Oldest created',
  modified: 'Recently modified',
}
export class TodoSettingTab extends PluginSettingTab {
  private pending: Partial<TodoSettings> = {}
  private timer: number
  constructor(
    app: App,
    private plugin: TodoPlugin,
  ) {
    super(app, plugin)
  }
  private saveText(key: keyof TodoSettings, value: string) {
    this.pending = {...this.pending, [key]: value}
    window.clearTimeout(this.timer)
    this.timer = window.setTimeout(() => this.flush(), 500)
  }
  private flush() {
    window.clearTimeout(this.timer)
    if (Object.keys(this.pending).length) {
      const updates = this.pending
      this.pending = {}
      void this.plugin.updateSettings(updates)
    }
  }
  hide() {
    this.flush()
  }
  display() {
    this.containerEl.empty()
    this.containerEl.createEl('h2', {text: 'Checklist'})
    this.containerEl.createEl('p', {
      text: 'Your notes are the source of truth. Organize their tasks here without moving or rewriting them.',
    })
    this.heading('Task sources')
    this.text(
      'todoPageName',
      'Included tags',
      'One tag per line. A tag includes its nested tags. Leave empty to show all Markdown tasks.',
      'todo',
      true,
    )
    this.text(
      'excludeTags',
      'Excluded tags',
      'Hide tasks or tagged blocks with these tags, including nested tags. A matching property tag excludes the whole note.',
      'archive\nsomeday',
      true,
    )
    this.text(
      'includeFiles',
      'File patterns',
      'One glob per line. Positive patterns include files; ! patterns exclude them. Leave empty to include every note.',
      'Projects/**\n!Projects/Archive/**',
      true,
    )
    this.toggle(
      'showAllTodos',
      'Include all tasks in matching notes',
      'Otherwise include tagged tasks, their children, and tagged blocks. A matching property tag always includes the entire note.',
    )
    this.heading('Organization')
    this.select('groupBy', 'Group by', {
      page: 'Page',
      tag: 'Tag',
      folder: 'Folder',
    })
    this.toggle(
      'subGroups',
      'Nested groups',
      'Within pages, group by tag. Within tags or folders, group by page.',
    )
    this.select('sortDirectionGroups', 'Group order', {
      ...SORT_OPTIONS,
      configured: 'Configured tag order',
    })
    this.select('sortDirectionSubGroups', 'Nested group order', SORT_OPTIONS)
    this.select('sortDirectionItems', 'Task order', {
      source: 'Order in note',
      ...SORT_OPTIONS,
    })
    this.heading('Display')
    this.select('lookAndFeel', 'Density', {
      classic: 'Comfortable',
      compact: 'Compact',
    })
    this.toggle(
      'showSource',
      'Show source notes',
      'Show each task’s note when grouping by tag or folder.',
    )
    this.toggle('showChecked', 'Show completed tasks')
    this.toggle('showOnlyActiveFile', 'Current note only')
    this.text(
      'focusFolder',
      'Focus folder',
      'Limit the view to this vault-relative folder and its subfolders. Clear to show every folder.',
      'Projects',
    )
    this.heading('Integration')
    this.toggle(
      'useTasksPlugin',
      'Complete with Tasks',
      'Use the Tasks plugin’s completion command, including its completion dates and recurrence rules. Requires Tasks 7.2 or later to be enabled.',
    )
    this.heading('Refresh')
    this.toggle(
      'autoRefresh',
      'Refresh automatically',
      'Update after notes change. You can always refresh from the pane or command palette.',
    )
  }
  private heading(text: string) {
    this.containerEl.createEl('h3', {text})
  }
  private text(
    key: keyof TodoSettings,
    name: string,
    desc: string,
    placeholder: string,
    multiline = false,
  ) {
    const setting = new Setting(this.containerEl).setName(name).setDesc(desc)
    const configure = (input: any) =>
      input
        .setPlaceholder(placeholder)
        .setValue(this.plugin.getSettingValue(key) as string)
        .onChange((value: string) => this.saveText(key, value))
    if (multiline) setting.addTextArea(configure)
    else setting.addText(configure)
  }
  private toggle(key: keyof TodoSettings, name: string, desc = '') {
    new Setting(this.containerEl)
      .setName(name)
      .setDesc(desc)
      .addToggle(input =>
        input
          .setValue(this.plugin.getSettingValue(key) as boolean)
          .onChange(value => this.plugin.updateSettings({[key]: value})),
      )
  }
  private select(
    key: keyof TodoSettings,
    name: string,
    options: Record<string, string>,
  ) {
    new Setting(this.containerEl).setName(name).addDropdown(input =>
      input
        .addOptions(options)
        .setValue(this.plugin.getSettingValue(key) as string)
        .onChange(value => this.plugin.updateSettings({[key]: value})),
    )
  }
}
