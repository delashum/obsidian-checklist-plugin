import {App, PluginSettingTab, Setting} from 'obsidian'

import type TodoPlugin from "./main"
import type { GroupByType, LookAndFeel, SortDirection } from "./_types"

export interface TodoSettings {
  todoPageName: string
  showChecked: boolean
  showAllTodos: boolean
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
  todoPageName: "todo",
  showChecked: false,
  showAllTodos: false,
  autoRefresh: true,
  subGroups: false,
  groupBy: "page",
  sortDirectionItems: "new->old",
  sortDirectionGroups: "new->old",
  sortDirectionSubGroups: "new->old",
  includeFiles: "",
  lookAndFeel: "classic",
  _collapsedSections: [],
  _hiddenTags: [],
}

export class TodoSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: TodoPlugin) {
    super(app, plugin)
  }

  display(): void {
    this.containerEl.empty()

    this.containerEl.createEl("h3", {
      text: "General Settings",
    })

    this.buildSettings()
  }

  private buildSettings() {
    /** GENERAL */

    new Setting(this.containerEl).setName("General")

    new Setting(this.containerEl)
      .setName("Tag name")
      .setDesc(
        'e.g. "todo" will match #todo. You may add mutliple tags separated by a newline. Leave empty to capture all'
      )
      .addTextArea((text) =>
        text
          .setPlaceholder("todo")
          .setValue(this.plugin.getSettingValue("todoPageName"))
          .onChange(async (value) => {
            await this.plugin.updateSettings({ todoPageName: value })
          })
      )

    new Setting(this.containerEl).setName("Show Completed?").addToggle((toggle) => {
      toggle.setValue(this.plugin.getSettingValue("showChecked"))
      toggle.onChange(async (value) => {
        await this.plugin.updateSettings({ showChecked: value })
      })
    })

    new Setting(this.containerEl).setName("Show All Todos In File?").setDesc(
      "Show all items in file if tag is present, or only items attached to the block where the tag is located. Only has an effect if Tag Name is not empty"
    ).addToggle((toggle) => {
      toggle.setValue(this.plugin.getSettingValue("showAllTodos"))
      toggle.onChange(async (value) => {
        await this.plugin.updateSettings({ showAllTodos: value })
      })
    })

    /** GORUPING & SORTING */

    new Setting(this.containerEl).setName("Grouping & Sorting")

    new Setting(this.containerEl).setName("Group By").addDropdown((dropdown) => {
      dropdown.addOption("page", "Page")
      dropdown.addOption("tag", "Tag")
      dropdown.setValue(this.plugin.getSettingValue("groupBy"))
      dropdown.onChange(async (value: GroupByType) => {
        await this.plugin.updateSettings({ groupBy: value })
      })
    })

    // new Setting(this.containerEl)
    //   .setName("Enable Sub-Groups?")
    //   .addToggle((toggle) => {
    //     toggle.setValue(this.plugin.getSettingValue("subGroups"))
    //     toggle.onChange(async (value) => {
    //       await this.plugin.updateSettings({ subGroups: value })
    //     })
    //   })
    //   .setDesc("When grouped by page you will see sub-groups by tag, and vice versa.")

    new Setting(this.containerEl)
      .setName("Item Sort")
      .addDropdown((dropdown) => {
        dropdown.addOption("a->z", "A -> Z")
        dropdown.addOption("z->a", "Z -> A")
        dropdown.addOption("new->old", "New -> Old")
        dropdown.addOption("old->new", "Old -> New")
        dropdown.setValue(this.plugin.getSettingValue("sortDirectionItems"))
        dropdown.onChange(async (value: SortDirection) => {
          await this.plugin.updateSettings({ sortDirectionItems: value })
        })
      })
      .setDesc("Time sorts are based on last time the file for a particular item was edited")

    new Setting(this.containerEl)
      .setName("Group Sort")
      .addDropdown((dropdown) => {
        dropdown.addOption("a->z", "A -> Z")
        dropdown.addOption("z->a", "Z -> A")
        dropdown.addOption("new->old", "New -> Old")
        dropdown.addOption("old->new", "Old -> New")
        dropdown.setValue(this.plugin.getSettingValue("sortDirectionGroups"))
        dropdown.onChange(async (value: SortDirection) => {
          await this.plugin.updateSettings({ sortDirectionGroups: value })
        })
      })
      .setDesc("Time sorts are based on last time the file for the newest or oldest item in a group was edited")

    // new Setting(this.containerEl)
    //   .setName("Sub-Group Sort")
    //   .addDropdown((dropdown) => {
    //     dropdown.addOption("a->z", "A -> Z")
    //     dropdown.addOption("z->a", "Z -> A")
    //     dropdown.addOption("new->old", "New -> Old")
    //     dropdown.addOption("old->new", "Old -> New")
    //     dropdown.setValue(this.plugin.getSettingValue("sortDirectionSubGroups"))
    //     dropdown.onChange(async (value: SortDirection) => {
    //       await this.plugin.updateSettings({ sortDirectionSubGroups: value })
    //     })
    //   })
    //   .setDesc("Time sorts are based on last time the file for the newest or oldest item in a group was edited")

    /** STYLING */

    new Setting(this.containerEl).setName("Styling")

    new Setting(this.containerEl).setName("Look and Feel").addDropdown((dropdown) => {
      dropdown.addOption("classic", "Classic")
      dropdown.addOption("compact", "Compact")
      dropdown.setValue(this.plugin.getSettingValue("lookAndFeel"))
      dropdown.onChange(async (value: LookAndFeel) => {
        await this.plugin.updateSettings({ lookAndFeel: value })
      })
    })

    /** ADVANCED */

    new Setting(this.containerEl).setName("Advanced")

    new Setting(this.containerEl)
      .setName("Include Files")
      .setDesc(
        'Include all files that match this glob pattern. Example; "!(exclude_1/**|exclude_2/**)}" includes all files except those in the exclude directories. Or "(Daily/**|Weekly/**) to only include files in the daily & weekly directories.  Leave empty to check all files.'
      )
      .setTooltip("**/*")
      .addText((text) =>
        text.setValue(this.plugin.getSettingValue("includeFiles")).onChange(async (value) => {
          console.log(value)
          await this.plugin.updateSettings({ includeFiles: value })
        })
      )

    new Setting(this.containerEl)
      .setName("Auto Refresh List?")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.getSettingValue("autoRefresh"))
        toggle.onChange(async (value) => {
          await this.plugin.updateSettings({ autoRefresh: value })
        })
      })
      .setDesc(
        'It\'s recommended to leave this on unless you are expereince performance issues due to a large vault. You can then reload manually using the "Checklist: refresh" command'
      )
  }
}
