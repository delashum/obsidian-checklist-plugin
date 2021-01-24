<script lang="ts">
  import type { App } from "obsidian"
  import { toggleTodoItem, parseTodos, groupTodos, navToFile, hoverFile } from "src/_utils"
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
    todoGroups = formGroups(todos)
  }

  function formGroups(_todos: TodoItem[]) {
    return groupTodos(showChecked ? _todos : _todos.filter((e) => !e.checked), groupBy)
  }

  function recalcItems() {
    todos = parseTodos(app.vault.getFiles(), todoTag, app.metadataCache, sortDirection)
    todoGroups = formGroups(todos)
  }

  $: {
    rerenderKey
    setTimeout(recalcItems, 50)
  }

  setTimeout(recalcItems, 200) // first run only; need timeout to make sure cache is populated
</script>

<div>
  <div class="todo-list">
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
            {#each todo.display as chunk}
              {#if chunk.type === "text"}
                <span>{chunk.content}</span>
              {:else if chunk.type === "link"}
                <span
                  class="link-item"
                  on:click={(ev) => {
                    ev.stopPropagation()
                    navToFile(chunk.filePath, ev)
                  }}
                  on:mouseenter={(ev) => {
                    hoverFile(ev, app, chunk.filePath)
                  }}>{chunk.label}</span
                >
              {/if}
            {/each}
          </div>
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
  .link-item {
    color: var(--text-accent);
    text-decoration: underline;
    cursor: pointer;
    transition: color 150ms ease-in-out;
  }
  .link-item:hover {
    color: var(--text-accent-hover);
  }
</style>
