<script lang="ts">
  import type { App } from "obsidian"

  import type { LookAndFeel, TodoGroup } from "src/_types"
  import { navToFile } from "src/utils"
  import ChecklistItem from "./ChecklistItem.svelte"
  import Icon from "./Icon.svelte"

  export let group: TodoGroup
  export let isCollapsed: boolean
  export let lookAndFeel: LookAndFeel
  export let app: App
  export let onToggle: (id: string) => void

  function clickTitle(ev: MouseEvent) {
    if (group.type === "page") navToFile(app, group.id, ev)
  }
</script>

<section class="group {group.className}">
  <header class={`group-header ${group.type}`}>
    <div class="title" on:click={clickTitle}>
      {#if group.type === "page"}
        {group.pageName}
      {:else if group.mainTag}
        <span class="tag-base">#</span>
        <span class={group.subTags == null ? "tag-sub" : "tag-base"}
          >{`${group.mainTag}${group.subTags != null ? "/" : ""}`}</span
        >
        {#if group.subTags != null}
          <span class="tag-sub">{group.subTags}</span>
        {/if}
      {:else}
        <span class="tag-base">All Tags</span>
      {/if}
    </div>
    <div class="space" />
    <div class="count">{group.todos.length}</div>
    <button class="collapse" on:click={() => onToggle(group.id)} title="Toggle Group">
      <Icon name="chevron" direction={isCollapsed ? "left" : "down"} />
    </button>
  </header>
  {#if !isCollapsed}
    <ul>
      {#each group.todos as item}
        <ChecklistItem {item} {lookAndFeel} {app} />
      {/each}
    </ul>
  {/if}
</section>

<style>
  .page {
    margin: var(--checklist-pageMargin);
    color: var(--checklist-textColor);
    transition: opacity 150ms ease-in-out;
    cursor: pointer;
  }

  .file-link:hover {
    opacity: 0.8;
  }

  header {
    font-weight: var(--checklist-headerFontWeight);
    font-size: var(--checklist-headerFontSize);
    margin: var(--checklist-headerMargin);
    display: flex;
    gap: var(--checklist-headerGap);
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
    padding: var(--checklist-countPadding);
    background: var(--checklist-countBackground);
    border-radius: var(--checklist-countBorderRadius);
    font-size: var(--checklist-countFontSize);
  }
  .title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
  }
  button {
    display: flex;
    padding: var(--checklist-buttonPadding);
    background: transparent;
  }

  .tag-base {
    color: var(--checklist-tagBaseColor);
  }
  .tag-sub {
    color: var(--checklist-tagSubColor);
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .group {
    margin-bottom: var(--checklist-groupMargin);
  }
</style>
