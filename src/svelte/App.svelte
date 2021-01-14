<script lang="ts">
  import type { App } from "obsidian"
  import { toggleTodoItem, parseTodos, getFileFromPath, isMetaPressed, groupTodos } from "src/_utils"
  import type { GroupByType, SortDirection, TodoGroup, TodoItem } from "src/_types"
  import CheckCircle from "./CheckCircle.svelte"
  import { beforeUpdate } from "svelte"

  export let todoTag: string
  export let showChecked: boolean
  export let groupBy: GroupByType
  export let sortDirection: SortDirection
  export let rerenderKey: symbol
  const app: App = (window as any).app
  let todos: TodoItem[] = []
  let todoGroups: TodoGroup[] = []

  function toggleItem(item: TodoItem) {
    toggleTodoItem(item, app)
    item.checked = !item.checked
    todos = [...todos]
    todoGroups = formGroups(todos)
  }

  function formGroups(_todos: TodoItem[]) {
    return groupTodos(showChecked ? _todos : _todos.filter((e) => !e.checked), groupBy)
  }

  async function navToFile(path: string, split: boolean) {
    const file = getFileFromPath(path, app)
    const leaf = split ? app.workspace.splitActiveLeaf() : app.workspace.getUnpinnedLeaf()
    await leaf.openFile(file)
  }

  function recalcItems() {
    todos = parseTodos(app.vault.getFiles(), todoTag, app.metadataCache, sortDirection)
    todoGroups = formGroups(todos)
  }

  beforeUpdate(() => {
    rerenderKey
    setTimeout(() => {
      recalcItems()
    }, 50)
  })
  setTimeout(() => {
    recalcItems()
  }, 200) // first run only; need timeout to make sure cache is populated
</script>

<div>
  <div class="todo-list">
    {#each todoGroups as group}
      {#if group.type === "page"}
        <div class="file-link group-header" on:click={(e) => navToFile(group.groupId, isMetaPressed(e))}>
          {group.groupName}
        </div>
      {:else}
        <div class="group-header">
          <span class="tag-base">{`#${todoTag}${group.groupName != null ? "/" : ""}`}</span><span class="tag-sub"
            >{group.groupName || ""}</span
          >
        </div>
      {/if}

      {#each group.todos as todo}
        <div class="todo-item" on:click={() => toggleItem(todo)}>
          <CheckCircle checked={todo.checked} />
          <div class="todo-text">{todo.text}</div>
        </div>
      {/each}
    {/each}
  </div>
</div>

<style>
  .todo-item {
    display: flex;
    align-items: center;
    gap: 4px;
    background-color: var(--interactive-normal);
    border-radius: 8px;
    padding: 8px;
    margin-bottom: 16px;
    cursor: pointer;
    transition: background-color 150ms ease-in-out;
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
  }

  .file-link:hover {
    cursor: pointer;
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
