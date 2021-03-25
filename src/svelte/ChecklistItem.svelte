<script lang="ts">
  import type { App } from "obsidian"

  import type { LookAndFeel, TodoItem } from "src/_types"
  import { navToFile, toggleTodoItem } from "src/_utils"
  import CheckCircle from "./CheckCircle.svelte"
  import TextChunk from "./TextChunk.svelte"

  export let item: TodoItem
  export let lookAndFeel: LookAndFeel
  export let app: App

  const toggleItem = async (item: TodoItem) => {
    toggleTodoItem(item, app)
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
  <div class="content">
    <TextChunk chunks={item.display} {app} />
  </div>
</li>

<style>
  li {
    display: flex;
    align-items: center;
    background-color: var(--interactive-normal);
    border-radius: 8px;
    margin-bottom: 12px;
    cursor: pointer;
    transition: background-color 100ms ease-in-out;
  }
  li:hover {
    background-color: var(--interactive-hover);
  }
  .toggle {
    padding-right: 8px;
    padding: 8px 12px;
  }
  .content {
    padding: 8px 12px;
    padding-left: 0 !important;
  }
  .compact {
    margin-bottom: 8px;
  }
  .compact > .content {
    padding: 4px 8px;
  }
  .compact > .toggle {
    padding: 4px 8px;
  }
  .toggle:hover {
    opacity: 0.8;
  }
</style>
