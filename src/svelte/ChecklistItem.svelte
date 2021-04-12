<script lang="ts">
  import type { App } from "obsidian"

  import type { LookAndFeel, TodoItem } from "src/_types"
  import { navToFile, toggleTodoItem } from "src/_utils"
  import CheckCircle from "./CheckCircle.svelte"

  export let item: TodoItem
  export let lookAndFeel: LookAndFeel
  export let app: App

  let contentDiv: HTMLDivElement

  const toggleItem = async (item: TodoItem) => {
    toggleTodoItem(item, app)
  }

  const handleClick = (ev: MouseEvent) => {
    const target: HTMLElement = ev.target as any
    if (target.tagName === "A") {
      ev.stopPropagation()
      if (target.dataset.type === "link") {
        navToFile(app, target.dataset.filepath, ev)
      } else if (target.dataset.type === "tag") {
        // goto tag
      }
    }
  }
  $: {
    if (contentDiv) contentDiv.innerHTML = item.rawHTML
  }
</script>

<li class={`${lookAndFeel}`} on:click={(ev) => navToFile(app, item.filePath, ev)}>
  <button
    class="toggle"
    on:click={(ev) => {
      toggleItem(item)
      ev.stopPropagation()
    }}
  >
    <CheckCircle checked={item.checked} />
  </button>
  <div bind:this={contentDiv} on:click={handleClick} class="content" />
</li>

<style>
  li {
    display: flex;
    align-items: center;
    background-color: var(--todoList-listItemBackground);
    border-radius: var(--todoList-listItemBorderRadius);
    margin: var(--todoList-listItemMargin);
    cursor: pointer;
    transition: background-color 100ms ease-in-out;
  }
  li:hover {
    background-color: var(--todoList-listItemBackground--hover);
  }
  .toggle {
    padding: var(--todoList-togglePadding);
    background: transparent;
  }
  .content {
    padding: var(--todoList-contentPadding);
  }
  .compact {
    bottom: var(--todoList-listItemMargin--compact);
  }
  .compact > .content {
    padding: var(--todoList-contentPadding--compact);
  }
  .compact > .toggle {
    padding: var(--todoList-togglePadding--compact);
  }
  .toggle:hover {
    opacity: 0.8;
  }
</style>
