import {App, PluginSettingTab, Setting} from 'obsidian'

import type TodoPlugin from "./main";

export interface TodoSettings {
  todoPageName: string;
}

export const DEFAULT_SETTINGS: TodoSettings = {
  todoPageName: "todo",
};

export class TodoSettingTab extends PluginSettingTab {
  plugin: TodoPlugin;

  constructor(app: App, plugin: TodoPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Settings for my awesome plugin." });

    new Setting(containerEl)
      .setName("List Link Name")
      .setDesc("Name of the link you will use to tag todo lists i.e. [[todo]]")
      .addText((text) =>
        text
          .setPlaceholder("todo")
          .setValue("todo")
          .onChange(async (value) => {
            console.log("Secret: " + value);
            this.plugin.settings.todoPageName = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
