<script lang="ts">
  import type { App } from "obsidian"

  import type { LookAndFeel, TodoGroup } from "src/_types"
  import { navToFile } from "src/_utils"
  import ChecklistItem from "./ChecklistItem.svelte"
  import Icon from "./Icon.svelte"

  export let group: TodoGroup
  export let mainTag: string
  export let isCollapsed: boolean
  export let lookAndFeel: LookAndFeel
  export let app: App
  export let onToggle: (id: string) => void
  export let groupNameAsClass: string

  $: {
    const groupName = group.groupName || mainTag
    const sanitzedGroupName = groupName.replace(/[^A-Za-z0-9]/g, "")
    const dasherizedGroupName = sanitzedGroupName.replace(/^([A-Z])|[\s\._](\w)/g, function (_, p1, p2) {
      if (p2) return "-" + p2.toLowerCase()
      return p1.toLowerCase()
    });

    groupNameAsClass = `group-${dasherizedGroupName}`
  }


  function clickTitle(ev: MouseEvent) {
    if (group.type === "page") navToFile(app, group.groupId, ev)
  }
</script>

<section class="group {groupNameAsClass}">
  <header class={`group-header ${group.type}`}>
    <div class="title" on:click={clickTitle}>
      {#if group.type === "page"}
        {group.groupName}
      {:else}
        <span class="tag-base">{`#${mainTag}${group.groupName != null ? "/" : ""}`}</span><span class="tag-sub"
          >{group.groupName ?? ""}</span
        >
      {/if}
    </div>
    <div class="space" />
    <div class="count">{group.todos.length}</div>
    <button class="collapse" on:click={() => onToggle(group.groupId, "page")} title="Toggle Group">
      <Icon name="chevron" direction={isCollapsed ? "left" : "down"} />
    </button>
  </header>
  <ul>
    {#if !isCollapsed}
      {#each group.todos as item}
        <ChecklistItem {item} {lookAndFeel} {app} />
      {/each}
    {/if}
  </ul>
</section>


<style>
  .page {
    margin: var(--todoList-pageMargin);
    color: var(--todoList-textColor);
    transition: opacity 150ms ease-in-out;
    cursor: pointer;
  }

  .file-link:hover {
    opacity: 0.8;
  }

  header {
    font-weight: var(--todoList-headerFontWeight);
    font-size: var(--todoList-headerFontSize);
    margin-bottom: var(--todoList-headerMargin);
    display: flex;
    gap: var(--todoList-headerGap);
    align-items: center;
  }

  .space {
    flex: 1;
  }
  button,
  .count,
  .title {
    flex-shrink: 1;
  }
  .count {
    padding: var(--todoList-countPadding);
    background: var(--interactive-normal);
    border-radius: var(--todoList-countBorderRadius);
    font-size: var(--todoList-countFontSize);
  }
  .title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  button {
    display: flex;
    padding: var(--todoList-buttonPadding);
    background: none;
  }

  .tag-base {
    color: var(--todoList-tagBaseColor);
  }
  .tag-sub {
    color: var(--todoList-tagSub);
  }

  ul {
    list-style: none;
    padding: 0;
  }
</style>
