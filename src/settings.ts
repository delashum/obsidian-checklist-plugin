import {App, PluginSettingTab, Setting} from 'obsidian'

import type TodoPlugin from "./main"
import type { GroupByOptions } from "./_types"

export interface TodoSettings {
  todoPageName: string
  showChecked: boolean
  groupBy: GroupByOptions
}

export const DEFAULT_SETTINGS: TodoSettings = {
  todoPageName: "todo",
  showChecked: false,
  groupBy: "page",
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
      .setDesc("Name of the tag you will use to tag todo lists i.e. #todo")
      .addText((text) =>
        text
          .setPlaceholder("todo")
          .setValue(this.plugin.settings.todoPageName)
          .onChange(async (value) => {
            this.plugin.settings.todoPageName = value
            await this.plugin.saveSettings()
          })
      )

    new Setting(containerEl)
      .setName("Show Completed?")
      .setDesc("Display completed todo items in list")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.showChecked)
        toggle.onChange(async (value) => {
          this.plugin.settings.showChecked = value
          await this.plugin.saveSettings()
        })
      })

    new Setting(containerEl)
      .setName("Group By")
      .setDesc("Group by page or tag")
      .addDropdown((dropdown) => {
        dropdown.addOption("Page", "page")
        dropdown.addOption("Tag", "tag")
        dropdown.setValue(this.plugin.settings.groupBy)
        dropdown.onChange(async (value: GroupByOptions) => {
          this.plugin.settings.groupBy = value
          await this.plugin.saveSettings()
        })
      })
  }
}
