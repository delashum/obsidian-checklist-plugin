<script lang="ts">
  import type { App } from 'obsidian'
  import type { TodoGroup } from 'src/_types'
  import { navToFile } from 'src/utils'
  import ChecklistItem from './ChecklistItem.svelte'
  import Icon from './Icon.svelte'
  export let group: TodoGroup
  export let isCollapsed: boolean
  export let showSource: boolean
  export let app: App
  export let onToggle: (id: string) => void
  $: label = group.type === 'page' ? group.pageName : group.mainTag ? '#' + [group.mainTag, group.subTags].filter(Boolean).join('/') : 'All tasks'
</script>

<section class="checklist-group {group.className}">
  <header class="checklist-group-header">
    <button class="checklist-group-toggle" on:click={() => onToggle(group.id)} aria-expanded={!isCollapsed} title={(isCollapsed ? 'Expand ' : 'Collapse ') + label}>
      <Icon name="chevron" direction={isCollapsed ? 'right' : 'down'} />
      <span class="checklist-group-title">{label}</span><span class="checklist-group-count">{group.todos.length}</span>
    </button>
    {#if group.type === 'page'}<button class="checklist-icon-button checklist-open-note" title={'Open ' + group.id} aria-label={'Open ' + group.id} on:click={(event) => navToFile(app, group.id, event)}><Icon name="external" /></button>{/if}
  </header>
  {#if !isCollapsed}<ul class="checklist-items">{#each group.todos as item}<ChecklistItem {item} {app} showSource={showSource && group.type === 'tag'} />{/each}</ul>{/if}
</section>
