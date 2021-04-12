<script lang="ts">
  import type { App } from "obsidian"
  import { toggleTodoItem, parseTodos, groupTodos } from "src/_utils"
  import type { GroupByType, LookAndFeel, SortDirection, TodoGroup, TodoItem } from "src/_types"
  import Loading from "./Loading.svelte"
  import type { TodoSettings } from "src/settings"
  import ChecklistGroup from "./ChecklistGroup.svelte"

  export let todoTag: string
  export let showChecked: boolean
  export let groupBy: GroupByType
  export let sortDirection: SortDirection
  export let lookAndFeel: LookAndFeel
  export let ignoreFiles: string
  export let includeFiles: string
  export let _collapsedSections: string[]
  export let updateSetting: (updates: Partial<TodoSettings>) => Promise<void>
  export let rerenderKey: symbol
  export let app: App
  let todos: TodoItem[] = []
  let todoGroups: TodoGroup[] = []
  let firstRun = true

  const formGroups = (_todos: TodoItem[]) => {
    return groupTodos(showChecked ? _todos : _todos.filter((e) => !e.checked), groupBy, sortDirection)
  }

  const recalcItems = async () => {
    todos = await parseTodos(
      app.vault.getFiles(),
      todoTag,
      app.metadataCache,
      app.vault,
      ignoreFiles,
      includeFiles,
      sortDirection
    )
    todoGroups = formGroups(todos)
    firstRun = false
  }

  const toggleGroup = (id: string) => {
    const newCollapsedSections = _collapsedSections.includes(id)
      ? _collapsedSections.filter((e) => e !== id)
      : [..._collapsedSections, id]
    updateSetting({ _collapsedSections: newCollapsedSections })
  }

  $: {
    rerenderKey
    if (firstRun) setTimeout(recalcItems, 600)
    else recalcItems()
  }
</script>

<div class="checklist-plugin-main markdown-preview-view">
  {#if firstRun}
    <Loading />
  {:else if todoGroups.length === 0}
    <div class="empty">
      {#if todoTag}
        No checklists found for tag: #{todoTag}
      {:else}
        No checklists found
      {/if}
    </div>
  {:else}
    {#each todoGroups as group}
      <ChecklistGroup
        {group}
        {app}
        {lookAndFeel}
        mainTag={todoTag}
        isCollapsed={_collapsedSections.includes(group.groupId)}
        onToggle={toggleGroup}
      />
    {/each}
  {/if}
</div>

<style>
  .empty {
    color: var(--text-faint);
    text-align: center;
  }

  .checklist-plugin-main {
    padding: initial;
    width: initial;
    height: initial;
    position: initial;
    overflow-y: initial;
    overflow-wrap: initial;
  }
</style>
