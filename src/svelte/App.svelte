<script lang="ts">
  import type { App } from "obsidian"
  import { toggleTodoItem, parseTodos, groupTodos, navToFile, hoverFile } from "src/_utils"
  import type { GroupByType, LookAndFeel, SortDirection, TodoGroup, TodoItem } from "src/_types"
  import CheckCircle from "./CheckCircle.svelte"
  import TodoText from "./TodoText.svelte"
  import Loading from "./Loading.svelte"

  export let todoTag: string
  export let showChecked: boolean
  export let groupBy: GroupByType
  export let sortDirection: SortDirection
  export let lookAndFeel: LookAndFeel
  export let ignoreFiles: string
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

  $: {
    rerenderKey
    if (firstRun) setTimeout(recalcItems, 800)
    else recalcItems()
  }
</script>

<div class={lookAndFeel}>
  <div class="todo-list">
    {#if firstRun}
      <Loading />
    {:else if todoGroups.length === 0}
      <div>No checklist items found for tag: #{todoTag}</div>
    {:else}
      {#each todoGroups as group}
        {#if group.type === "page"}
          <div class="file-link group-header" on:click={(e) => navToFile(group.groupId, e)}>
            {group.groupName}
          </div>
        {:else}
          <div class="group-header">
            <span class="tag-base">{`#${todoTag}${group.groupName != null ? "/" : ""}`}</span><span class="tag-sub"
              >{group.groupName ?? ""}</span
            >
          </div>
        {/if}

        {#each group.todos as todo}
          <div class="todo-item" on:click={() => toggleItem(todo)}>
            <CheckCircle checked={todo.checked} />
            <div class="todo-text">
              <TodoText chunks={todo.display} />
            </div>
          </div>
        {/each}
      {/each}
    {/if}
  </div>
</div>

<style>
  .todo-item {
    display: flex;
    align-items: center;
    gap: 4px;
    background-color: var(--interactive-normal);
    border-radius: 8px;
    padding: 8px 12px;
    margin-bottom: 16px;
    cursor: pointer;
    transition: background-color 100ms ease-in-out;
  }

  .compact .todo-item {
    margin-bottom: 8px;
    padding: 4px 8px;
  }

  .todo-item:hover {
    background-color: var(--interactive-hover);
  }

  .todo-text {
    margin-left: 8px;
  }

  .file-link {
    margin-bottom: 4px;
    color: var(--text-muted);
    transition: opacity 150ms ease-in-out;
    cursor: pointer;
  }

  .file-link:hover {
    opacity: 0.8;
  }

  .group-header {
    font-weight: 600;
    font-size: 16px;
    margin-bottom: 8px;
  }

  .tag-base {
    color: var(--text-faint);
  }
  .tag-sub {
    color: var(--text-muted);
  }
</style>
