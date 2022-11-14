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

  const toggleItem = async (_item: TodoItem) => {
    app.workspace.trigger("dataview:refresh-views")
    await toggleTodoItem(_item, app)
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
    // console.debug("hi", item.checked)
	// item.checked = !item.checked
  }
</script>

<li class={`${lookAndFeel}`} on:click={(ev) => navToFile(app, item.file.path, ev)}>
  <div class="checklist-task">
    <button
      class="toggle"
      on:click={(ev) => {
        toggleItem(item)
        ev.stopPropagation()
      }}>
      <CheckCircle bind:checked={item.checked} />
    </button>
    <div bind:this={contentDiv} class="content"/>
    
  </div>
  <div on:click={(ev) => handleClick(ev, item)} class="content-parent">
	<ul class="nested-list">
	  {#each item.children as taskchild}
		  <svelte:self {lookAndFeel} {app} bind:item={taskchild}/>
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
    /* display: flex; */
	  align-items: baseline;
    cursor: pointer;
    
  }
  .checklist-task {
    background-color: var(--checklist-listItemBackground);
    border-radius: var(--checklist-listItemBorderRadius);
    margin: var(--checklist-listItemMargin);
    transition: background-color 100ms ease-in-out;
    display: flex;
  }
  .checklist-task:hover {
    background-color: var(--checklist-listItemBackground--hover);
    
  }
  li > div {
    flex-grow: 1;
  }
  ul.nested-list {
    list-style: none;
    padding-right: 0;
    padding-left: 1.2em
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
