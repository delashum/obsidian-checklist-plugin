import {App, PluginSettingTab, Setting} from 'obsidian'

import type TodoPlugin from "./main"
import type { GroupByType, SortDirection } from "./_types"

export interface TodoSettings {
  todoPageName: string
  showChecked: boolean
  groupBy: GroupByType
  sortDirection: SortDirection
}

export const DEFAULT_SETTINGS: TodoSettings = {
  todoPageName: "todo",
  showChecked: false,
  groupBy: "page",
  sortDirection: "old->new",
}

export class TodoSettingTab extends PluginSettingTab {
  plugin: TodoPlugin

  constructor(app: App, plugin: TodoPlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    let { containerEl } = this

    this.containerEl.empty()

    this.containerEl.createEl("h3", {
      text: "General Settings",
    })

    new Setting(containerEl)
      .setName("Tag name")
      .setDesc("e.g. #todo")
      .addText((text) =>
        text
          .setPlaceholder("todo")
          .setValue(this.plugin.settings.todoPageName)
          .onChange(async (value) => {
            this.plugin.settings.todoPageName = value
            await this.plugin.saveSettings()
          })
      )

    new Setting(containerEl).setName("Show Completed?").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.showChecked)
      toggle.onChange(async (value) => {
        this.plugin.settings.showChecked = value
        await this.plugin.saveSettings()
      })
    })

    new Setting(containerEl).setName("Group By").addDropdown((dropdown) => {
      dropdown.addOption("page", "Page")
      dropdown.addOption("tag", "Tag")
      dropdown.setValue(this.plugin.settings.groupBy)
      dropdown.onChange(async (value: GroupByType) => {
        this.plugin.settings.groupBy = value
        await this.plugin.saveSettings()
      })
    })

    new Setting(containerEl).setName("Sort Direction").addDropdown((dropdown) => {
      dropdown.addOption("new->old", "New -> Old")
      dropdown.addOption("old->new", "Old -> New")
      dropdown.setValue(this.plugin.settings.sortDirection)
      dropdown.onChange(async (value: SortDirection) => {
        this.plugin.settings.sortDirection = value
        await this.plugin.saveSettings()
      })
    })
  }
}
