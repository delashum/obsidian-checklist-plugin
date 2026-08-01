<script lang="ts">
  import type { App } from "obsidian"

  import type { LookAndFeel, TodoItem } from "src/_types"
  import { navToFile, toggleTodoItem } from "src/utils"
  import CheckCircle from "./CheckCircle.svelte"

  export let item: TodoItem
  export let lookAndFeel: LookAndFeel
  export let app: App

  let contentDiv: HTMLDivElement

  const toggleItem = async (item: TodoItem) => {
    toggleTodoItem(item, app)
  }

  const handleClick = (ev: MouseEvent, item?: TodoItem) => {
    const target: HTMLElement = ev.target as any
    if (target.tagName === "A") {
      ev.stopPropagation()
      if (target.dataset.type === "link") {
        navToFile(app, target.dataset.filepath, ev, item?.line)
      } else if (target.dataset.type === "tag") {
        // goto tag
      }
    }
    else {
      navToFile(app, item.filePath, ev, item?.line)
    }
  }
  $: {
    if (contentDiv) contentDiv.innerHTML = item.rawHTML
  }
</script>

<li class={`${lookAndFeel}`}>
  <div class="task-row">
    <button
      class="toggle"
      on:click={(ev) => {
        toggleItem(item)
        ev.stopPropagation()
      }}
    >
      <CheckCircle checked={item.checked} />
    </button>
    <div bind:this={contentDiv} on:click={(ev) => handleClick(ev, item)} class="content" />
  </div>
  {#if item.children.length > 0}
    <ul class="children">
      {#each item.children as child (`${child.filePath}:${child.line}`)}
        <svelte:self item={child} {lookAndFeel} {app} />
      {/each}
    </ul>
  {/if}
</li>

<style>
  li {
    display: grid;
    gap: var(--checklist-itemGap);
    margin: 0;
    list-style: none;
  }
  .task-row {
    display: flex;
    align-items: center;
    background-color: var(--checklist-listItemBackground);
    border-radius: var(--checklist-listItemBorderRadius);
    cursor: pointer;
    transition: background-color 100ms ease-in-out;
  }
  li:hover > .task-row {
    background-color: var(--checklist-listItemBackground--hover);
  }
  .children {
    display: grid;
    gap: var(--checklist-itemGap);
    list-style: none;
    margin: 0;
    padding-inline-start: var(--checklist-childrenIndent) !important;
  }
  .toggle {
    padding: var(--checklist-togglePadding);
    background: transparent;
    box-shadow: var(--checklist-listItemBoxShadow);
    flex-shrink: 1;
    width: initial;
  }
  .content {
    padding: var(--checklist-contentPadding);
    flex: 1;
    min-width: 0;
    font-size: var(--checklist-contentFontSize);
    line-height: 1.35;
  }
  .compact > .task-row > .content {
    padding: var(--checklist-contentPadding--compact);
  }
  .compact > .task-row > .toggle {
    padding: var(--checklist-togglePadding--compact);
  }
  .toggle:hover {
    opacity: 0.8;
  }
</style>
