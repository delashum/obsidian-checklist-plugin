import {App, PluginSettingTab, Setting} from 'obsidian'

import type TodoPlugin from "./main"
import type { GroupByType, LookAndFeel, SortDirection } from "./_types"

export interface TodoSettings {
  todoPageName: string
  showChecked: boolean
  groupBy: GroupByType
  sortDirection: SortDirection
  ignoreFiles: string
  lookAndFeel: LookAndFeel
}

export const DEFAULT_SETTINGS: TodoSettings = {
  todoPageName: "todo",
  showChecked: false,
  groupBy: "page",
  sortDirection: "old->new",
  ignoreFiles: "",
  lookAndFeel: "classic",
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

    new Setting(containerEl)
      .setName("Ignore Files")
      .setDesc(
        "Ignore files that contain this text anywhere in the filepath. (e.g. 'template' to ignore template.md and templates/file.md)"
      )
      .addText((text) =>
        text.setValue(this.plugin.settings.ignoreFiles).onChange(async (value) => {
          this.plugin.settings.ignoreFiles = value
          await this.plugin.saveSettings()
        })
      )

    new Setting(containerEl).setName("Look and Feel").addDropdown((dropdown) => {
      dropdown.addOption("classic", "Classic")
      dropdown.addOption("compact", "Compact")
      dropdown.setValue(this.plugin.settings.lookAndFeel)
      dropdown.onChange(async (value: LookAndFeel) => {
        this.plugin.settings.lookAndFeel = value
        await this.plugin.saveSettings()
      })
    })
  }
}
