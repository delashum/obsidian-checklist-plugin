<script lang="ts">
  import type { App } from "obsidian"
  import { toggleTodoItem, parseTodos, groupTodos, navToFile, hoverFile } from "src/_utils"
  import type { GroupByType, LookAndFeel, SortDirection, TodoGroup, TodoItem } from "src/_types"
  import CheckCircle from "./CheckCircle.svelte"
  import TodoText from "./TextChunk.svelte"
  import Loading from "./Loading.svelte"
  import type { TodoSettings } from "src/settings"
  import Icon from "./Icon.svelte"
  import ChecklistGroup from "./ChecklistGroup.svelte"

  export let todoTag: string
  export let showChecked: boolean
  export let groupBy: GroupByType
  export let sortDirection: SortDirection
  export let lookAndFeel: LookAndFeel
  export let ignoreFiles: string
  export let _collapsedSections: string[]
  export let updateSetting: (updates: Partial<TodoSettings>) => Promise<void>
  export let rerenderKey: symbol
  const app: App = (window as any).app
  let todos: TodoItem[] = []
  let todoGroups: TodoGroup[] = []
  let firstRun = true

  const formGroups = (_todos: TodoItem[]) => {
    return groupTodos(showChecked ? _todos : _todos.filter((e) => !e.checked), groupBy)
  }

  const toggleItem = async (item: TodoItem) => {
    toggleTodoItem(item, app)
    item.checked = !item.checked
    todoGroups = formGroups(todos)
  }

  const recalcItems = async () => {
    todos = await parseTodos(app.vault.getFiles(), todoTag, app.metadataCache, app.vault, sortDirection, ignoreFiles)
    todoGroups = formGroups(todos)
    firstRun = false
  }

  const toggleGroup = (id: string, type: "page" | "tag") => {
    const newCollapsedSections = _collapsedSections.includes(id)
      ? _collapsedSections.filter((e) => e !== id)
      : [..._collapsedSections, id]
    updateSetting({ _collapsedSections: newCollapsedSections })
  }

  $: {
    rerenderKey
    if (firstRun) setTimeout(recalcItems, 800)
    else recalcItems()
  }
</script>

<div class="todo-list">
  {#if firstRun}
    <Loading />
  {:else if todoGroups.length === 0}
    <div>No checklist items found for tag: #{todoTag}</div>
  {:else}
    <div class="header" />
    {#each todoGroups as group}
      <ChecklistGroup
        {group}
        {lookAndFeel}
        mainTag={todoTag}
        isCollapsed={_collapsedSections.includes(group.groupId)}
        onToggle={toggleGroup}
      />
    {/each}
  {/if}
</div>

<style>
  .tag-base {
    color: var(--text-faint);
  }
  .tag-sub {
    color: var(--text-muted);
  }
</style>
