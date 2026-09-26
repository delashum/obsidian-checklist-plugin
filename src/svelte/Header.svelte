<script lang="ts">
  import type { TodoSettings } from 'src/settings'
  import type { GroupByType, LookAndFeel } from 'src/_types'
  import Icon from './Icon.svelte'
  import { clickOutside } from './clickOutside.directive'

  export let todoTags: string[]
  export let hiddenTags: string[]
  export let groupBy: GroupByType
  export let showChecked: boolean
  export let showOnlyActiveFile: boolean
  export let showSource: boolean
  export let lookAndFeel: LookAndFeel
  export let taskCount: number
  export let allCollapsed: boolean
  export let hasGroups: boolean
  export let onToggleAll: () => void
  export let updateSetting: (updates: Partial<TodoSettings>) => Promise<void>
  export let onTagStatusChange: (tag: string, status: boolean) => void
  export let onSearch: (str: string) => void
  let showPopover = false
  let search = ''
  let searchInput: HTMLInputElement
  let displayButton: HTMLButtonElement

  function clearSearch() { search = ''; onSearch(''); searchInput.focus() }
  function closeOnEscape(event: KeyboardEvent) {
    if (event.key === 'Escape' && showPopover) { showPopover = false; displayButton.focus(); event.stopPropagation() }
  }
</script>

<div class="checklist-toolbar" use:clickOutside on:click_outside={() => showPopover = false} on:keydown={closeOnEscape}>
  <div class="checklist-toolbar-heading">
    <span class="checklist-toolbar-title">Tasks <span class="checklist-total">{taskCount}</span></span>
    <div class="checklist-toolbar-actions">
      <button class="checklist-icon-button" disabled={!hasGroups} on:click={onToggleAll} title={allCollapsed ? 'Expand all groups' : 'Collapse all groups'} aria-label={allCollapsed ? 'Expand all groups' : 'Collapse all groups'}><Icon name={allCollapsed ? 'expand' : 'collapse'} /></button>
      <button bind:this={displayButton} class="checklist-icon-button" class:is-active={showPopover} title="Display options" aria-label="Display options" aria-expanded={showPopover} on:click={() => showPopover = !showPopover}><Icon name="settings" /></button>
    </div>
  </div>
  <div class="checklist-search-wrap">
    <Icon name="search" />
    <input bind:this={searchInput} class="checklist-search" type="text" placeholder="Search tasks…" aria-label="Search tasks" bind:value={search} on:input={() => onSearch(search)} on:keydown={(event) => { if (event.key === 'Escape' && search) { event.stopPropagation(); clearSearch() } }} />
    {#if search}<button class="checklist-icon-button" title="Clear search" aria-label="Clear search" on:click={clearSearch}><Icon name="close" /></button>{/if}
  </div>
  {#if showOnlyActiveFile}<button class="checklist-filter-chip" title="Show tasks from all files" on:click={() => updateSetting({showOnlyActiveFile: false})}><Icon name="file" />Current file<Icon name="close" /></button>{/if}
  {#if showPopover}
    <div class="checklist-display-panel" role="group" aria-label="Display options">
      <div class="checklist-panel-heading">Display</div>
      <label class="checklist-option">Group by<select value={groupBy} on:change={(event) => updateSetting({groupBy: event.currentTarget.value})}><option value="page">Page</option><option value="tag">Tag</option></select></label>
      <label class="checklist-option">Density<select value={lookAndFeel} on:change={(event) => updateSetting({lookAndFeel: event.currentTarget.value})}><option value="classic">Comfortable</option><option value="compact">Compact</option></select></label>
      <label class="checklist-option"><span>Show completed</span><input type="checkbox" checked={showChecked} on:change={(event) => updateSetting({showChecked: event.currentTarget.checked})} /></label>
      <label class="checklist-option"><span>Current file only</span><input type="checkbox" checked={showOnlyActiveFile} on:change={(event) => updateSetting({showOnlyActiveFile: event.currentTarget.checked})} /></label>
      <label class="checklist-option"><span>Show source notes</span><input type="checkbox" checked={showSource} on:change={(event) => updateSetting({showSource: event.currentTarget.checked})} /></label>
      {#if todoTags.length}
        <div class="checklist-panel-heading checklist-tags-heading">Tags</div>
        <div class="checklist-tag-options">{#each todoTags as tag}<label class="checklist-option"><span class="checklist-tag-label" title={'#' + tag}>#{tag}</span><input type="checkbox" checked={!hiddenTags.includes(tag)} on:change={(event) => onTagStatusChange(tag, event.currentTarget.checked)} /></label>{/each}</div>
      {/if}
    </div>
  {/if}
</div>
