<script lang="ts">
  import type { App } from "obsidian"

  import type { LookAndFeel, TodoItem } from "src/_types"
  import { navToFile, toggleTodoItem } from "src/utils"
  import CheckCircle from "./CheckCircle.svelte"
  import { children } from "svelte/internal";

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
  }
  $: {
    if (contentDiv) contentDiv.innerHTML = item.html
    item = item
  }
</script>

<li class={`${lookAndFeel}`} on:click={(ev) => navToFile(app, item.file.path, ev)}>
  <button
    class="toggle"
    on:click={(ev) => {
      toggleItem(item)
      ev.stopPropagation()
    }}
  >
    <CheckCircle checked={item.checked} />
  </button>
  <div on:click={(ev) => handleClick(ev, item)} class="content-parent">
    <div bind:this={contentDiv} class="content"/>
	<ul class="nested-list">
		{#each item.children as taskchild}
			<svelte:self {lookAndFeel} {app} item={taskchild}/>
		{/each}
	</ul>
  </div>
</li>

<style>
  ul.nested-list {
    padding-left: 0;
    padding-right: 1.2em;
  }
  li {
    display: flex;
	align-items: baseline;
    background-color: var(--checklist-listItemBackground);
    border-radius: var(--checklist-listItemBorderRadius);
    margin: var(--checklist-listItemMargin);
    cursor: pointer;
    transition: background-color 100ms ease-in-out;
  }
  li:hover {
    background-color: var(--checklist-listItemBackground--hover);
  }
  li > div {
    flex-grow: 1;
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
    font-size: var(--checklist-contentFontSize);
  }
  .compact ul.nested-list, li.compact {
    /* padding-right:  !important; */
  }
  .compact {
    bottom: var(--checklist-listItemMargin--compact);
  }
  .compact > .toggle {
    padding: var(--checklist-togglePadding--compact);
  }
  .toggle:hover {
    opacity: 0.8;
  }
</style>
