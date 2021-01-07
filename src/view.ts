import {ItemView, WorkspaceLeaf} from 'obsidian'

import {TODO_VIEW_TYPE} from './constants'
import {TodoSettings} from './settings'

export default class TodoListView extends ItemView {
  private settings: TodoSettings;

  constructor(leaf: WorkspaceLeaf, settings: TodoSettings) {
    super(leaf);

    this.settings = settings;
  }

  getViewType(): string {
    return TODO_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Todo List";
  }

  getIcon(): string {
    return "calendar-with-checkmark";
  }

  async onClose(): Promise<void> {}

  async onOpen(): Promise<void> {
    this.containerEl.innerHTML = "nice try boys";
  }
}
