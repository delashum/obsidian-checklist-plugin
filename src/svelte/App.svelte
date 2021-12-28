<script lang="ts">
  import type { App } from "obsidian"
  import { parseTodos, groupTodos } from "src/_utils"
  import type { GroupByType, LookAndFeel, SortDirection, TodoGroup, TodoItem } from "src/_types"
  import Loading from "./Loading.svelte"
  import type { TodoSettings } from "src/settings"
  import ChecklistGroup from "./ChecklistGroup.svelte"

  export let todoTag: string
  export let lookAndFeel: LookAndFeel
  export let _collapsedSections: string[]
  export let updateSetting: (updates: Partial<TodoSettings>) => Promise<void>
  export let app: App
  export let todoGroups: TodoGroup[] = []
  export let initialLoad: boolean

  const toggleGroup = (id: string) => {
    const newCollapsedSections = _collapsedSections.includes(id)
      ? _collapsedSections.filter((e) => e !== id)
      : [..._collapsedSections, id]
    updateSetting({ _collapsedSections: newCollapsedSections })
  }
</script>

<div class="checklist-plugin-main markdown-preview-view">
  {#if initialLoad}
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
        isCollapsed={_collapsedSections.includes(group.id)}
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
