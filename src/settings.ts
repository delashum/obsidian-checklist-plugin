import {App, PluginSettingTab, Setting} from 'obsidian'

import type TodoPlugin from "./main"
import type { GroupByType, LookAndFeel, SortDirection } from "./_types"

export interface TodoSettings {
  todoPageName: string
  showChecked: boolean
  groupBy: GroupByType
  sortDirectionItems: SortDirection
  sortDirectionGroups: SortDirection
  ignoreFiles: string
  includeFiles: string
  lookAndFeel: LookAndFeel
  _collapsedSections: string[]
}

export const DEFAULT_SETTINGS: TodoSettings = {
  todoPageName: "todo",
  showChecked: false,
  groupBy: "page",
  sortDirectionItems: "old->new",
  sortDirectionGroups: "a->z",
  ignoreFiles: "",
  includeFiles: "",
  lookAndFeel: "classic",
  _collapsedSections: [],
}

export class TodoSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: TodoPlugin) {
    super(app, plugin)
  }

  display(): void {
    let { containerEl } = this

    this.containerEl.empty()

    this.containerEl.createEl("h3", {
      text: "General Settings",
    })

    new Setting(containerEl)
      .setName("Tag name")
      .setDesc("e.g. #todo. Leave empty to capture all")
      .addText((text) =>
        text
          .setPlaceholder("todo")
          .setValue(this.plugin.getSettingValue("todoPageName"))
          .onChange(async (value) => {
            await this.plugin.updateSettings({ todoPageName: value })
          })
      )

    new Setting(containerEl).setName("Show Completed?").addToggle((toggle) => {
      toggle.setValue(this.plugin.getSettingValue("showChecked"))
      toggle.onChange(async (value) => {
        await this.plugin.updateSettings({ showChecked: value })
      })
    })

    new Setting(containerEl).setName("Group By").addDropdown((dropdown) => {
      dropdown.addOption("page", "Page")
      dropdown.addOption("tag", "Tag")
      dropdown.setValue(this.plugin.getSettingValue("groupBy"))
      dropdown.onChange(async (value: GroupByType) => {
        await this.plugin.updateSettings({ groupBy: value })
      })
    })

    new Setting(containerEl).setName("Item Sort").addDropdown((dropdown) => {
      dropdown.addOption("new->old", "New -> Old")
      dropdown.addOption("old->new", "Old -> New")
      dropdown.addOption("a->z", "A -> Z")
      dropdown.addOption("z->a", "Z -> A")
      dropdown.setValue(this.plugin.getSettingValue("sortDirectionItems"))
      dropdown.onChange(async (value: SortDirection) => {
        await this.plugin.updateSettings({ sortDirectionItems: value })
      })
    })

    new Setting(containerEl).setName("Group Sort").addDropdown((dropdown) => {
      dropdown.addOption("a->z", "A -> Z")
      dropdown.addOption("z->a", "Z -> A")
      dropdown.setValue(this.plugin.getSettingValue("sortDirectionGroups"))
      dropdown.onChange(async (value: SortDirection) => {
        await this.plugin.updateSettings({ sortDirectionGroups: value })
      })
    })

    new Setting(containerEl)
      .setName("Ignore Files")
      .setDesc(
        "Ignore files that match this glob pattern in the filepath. (e.g. 'template*/*' to ignore template.md and templates/file.md)"
      )
      .addText((text) =>
        text.setValue(this.plugin.getSettingValue("ignoreFiles")).onChange(async (value) => {
          await this.plugin.updateSettings({ ignoreFiles: value })
        })
      )

    new Setting(containerEl)
      .setName("Include Files")
      .setDesc(
        "Only search files whose path begins with this value (e.g. 'tasks' would search tasks/file.md and tasks_folder/file.md and not other_sub/file.md or file.md)"
      )
      .addText((text) =>
        text.setValue(this.plugin.getSettingValue("includeFiles")).onChange(async (value) => {
          await this.plugin.updateSettings({ includeFiles: value })
        })
      )

    new Setting(containerEl).setName("Look and Feel").addDropdown((dropdown) => {
      dropdown.addOption("classic", "Classic")
      dropdown.addOption("compact", "Compact")
      dropdown.setValue(this.plugin.getSettingValue("lookAndFeel"))
      dropdown.onChange(async (value: LookAndFeel) => {
        await this.plugin.updateSettings({ lookAndFeel: value })
      })
    })
  }
}
