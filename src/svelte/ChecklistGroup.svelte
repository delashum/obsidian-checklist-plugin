<script lang="ts">
  import type {App} from 'obsidian'
  import type {TodoGroup} from 'src/_types'
  import {navToFile} from 'src/utils'
  import {countTodoTree} from 'src/utils/hierarchy'
  import ChecklistItem from './ChecklistItem.svelte'
  import Icon from './Icon.svelte'
  export let group: TodoGroup
  export let collapsed: string[]
  export let showSource: boolean
  export let useTasksPlugin = false
  export let onTagClick: (tag: string) => void
  export let app: App
  export let onToggle: (id: string) => void
  export let onTaskChanged: (path: string) => Promise<void>
  $: isCollapsed = collapsed.includes(group.id)
</script>

<section class="checklist-group {group.className}">
  <header class="checklist-group-header">
    <button
      class="checklist-group-toggle"
      on:click={() => onToggle(group.id)}
      aria-expanded={!isCollapsed}
      title={(isCollapsed ? 'Expand ' : 'Collapse ') + group.label}>
      <span class="checklist-group-marker"
        ><Icon
          name="chevron"
          direction={isCollapsed ? 'right' : 'down'} /></span>
      <span class="checklist-group-title"
        >{#if group.type === 'tag' && group.mainTag}<span
            class="checklist-tag-base">#{group.mainTag}</span
          >{#if group.subTags}<span class="checklist-tag-sub"
              >/{group.subTags}</span
            >{/if}{:else}{group.label}{/if}</span
      ><span class="checklist-group-count">{countTodoTree(group.todos)}</span>
    </button>
    {#if group.path}<button
        class="checklist-icon-button checklist-open-note"
        title={'Open ' + group.path}
        aria-label={'Open ' + group.path}
        on:click={event => navToFile(app, group.path, event)}
        ><Icon name="arrow-right" /></button
      >{/if}
  </header>
  {#if !isCollapsed}
    {#if group.groups}
      <div class="checklist-subgroups">
        {#each group.groups as child (child.id)}<svelte:self
            group={child}
            {app}
            {showSource}
            {collapsed}
            {onToggle}
            {onTaskChanged}
            {onTagClick}
            {useTasksPlugin} />{/each}
      </div>
    {:else}
      <ul class="checklist-items">
        {#each group.todos as item (item.filePath + ':' + item.line)}<ChecklistItem
            {item}
            {app}
            {useTasksPlugin}
            {onTaskChanged}
            {onTagClick}
            showSource={showSource && group.type !== 'page'} />{/each}
      </ul>
    {/if}
  {/if}
</section>
