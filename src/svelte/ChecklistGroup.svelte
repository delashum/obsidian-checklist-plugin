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
  export let onToggle: (id: string, type: "page" | "tag") => void

  function clickTitle(ev: MouseEvent) {
    if (group.type === "page") navToFile(app, group.groupId, ev)
  }
</script>

<div class="group">
  <div class={`group-header ${group.type}`}>
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
    <div class="collapse" on:click={() => onToggle(group.groupId, "page")}>
      <Icon name="chevron" direction={isCollapsed ? "left" : "down"} />
    </div>
  </div>
  {#if !isCollapsed}
    {#each group.todos as item}
      <ChecklistItem {item} {lookAndFeel} {app} />
    {/each}
  {/if}
</div>

<style>
  .page {
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
    font-size: 14pt;
    margin-bottom: 8px;
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .space {
    flex: 1;
  }
  .count,
  .collapse,
  .title {
    flex-shrink: 1;
  }
  .count {
    padding: 0px 6px;
    background: var(--interactive-normal);
    border-radius: 4px;
    font-size: 14px;
  }
  .title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .collapse {
    display: flex;
  }

  .tag-base {
    color: var(--text-faint);
  }
  .tag-sub {
    color: var(--text-muted);
  }
</style>
