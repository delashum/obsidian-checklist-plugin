<script lang="ts">
  import {tick} from 'svelte'
  import type {TodoSettings} from 'src/settings'
  import type {GroupByType, SortDirection} from 'src/_types'
  import Icon from './Icon.svelte'
  import {SORT_OPTIONS} from 'src/settings'
  import {clickOutside} from './clickOutside.directive'

  export let todoTags: string[]
  export let hiddenTags: string[]
  export let groupBy: GroupByType
  export let showChecked: boolean
  export let showOnlyActiveFile: boolean
  export let showGroupCounts: boolean
  export let showSource: boolean
  export let taskCount: number
  export let subGroupBy: GroupByType
  export let nestSubtasks: boolean
  export let sortDirectionGroups: SortDirection
  export let sortDirectionItems: SortDirection
  export let focusFolder: string
  export let loading: boolean
  export let onRefresh: () => Promise<void>
  export let allCollapsed: boolean
  export let hasGroups: boolean
  export let onToggleAll: () => void
  export let updateSetting: (updates: Partial<TodoSettings>) => Promise<void>
  export let onTagStatusChange: (tag: string, status: boolean) => void
  export let onSearch: (str: string) => void
  let showPopover = false
  export let search = ''
  let showSearch = false
  let allScopeWidth = 0
  let noteScopeWidth = 0
  let searchButton: HTMLButtonElement
  $: if (search) showSearch = true

  async function toggleSearch() {
    if (showSearch) {
      search = ''
      onSearch('')
      showSearch = false
      searchButton.focus()
    } else {
      showSearch = true
      await tick()
      searchInput.focus()
    }
  }

  let searchInput: HTMLInputElement
  let displayButton: HTMLButtonElement

  function clearSearch() {
    search = ''
    onSearch('')
    searchInput.focus()
  }
  function closeOnEscape(event: KeyboardEvent) {
    if (event.key === 'Escape' && showPopover) {
      showPopover = false
      displayButton.focus()
      event.stopPropagation()
    }
  }
</script>

<div
  class="checklist-toolbar"
  use:clickOutside
  on:click_outside={() => (showPopover = false)}
  on:keydown={closeOnEscape}>
  <div class="checklist-toolbar-heading">
    <span class="checklist-toolbar-title">Tasks</span>
    <div
      class="checklist-scope"
      class:is-note={showOnlyActiveFile}
      style={`--scope-all-width: ${allScopeWidth}px; --scope-note-width: ${noteScopeWidth}px`}
      role="group"
      aria-label="Task scope">
      <button
        bind:clientWidth={allScopeWidth}
        class:is-selected={!showOnlyActiveFile}
        aria-pressed={!showOnlyActiveFile}
        on:click={() => updateSetting({showOnlyActiveFile: false})}
        title="All notes"
        aria-label="All notes">All</button>
      <button
        bind:clientWidth={noteScopeWidth}
        class:is-selected={showOnlyActiveFile}
        aria-pressed={showOnlyActiveFile}
        on:click={() => updateSetting({showOnlyActiveFile: true})}
        title="This note"
        aria-label="This note">Note</button>
    </div>
    {#if showGroupCounts}
      <span class="checklist-total" aria-label={`${taskCount} tasks`}
        >{taskCount}</span>
    {/if}
    <div class="checklist-toolbar-actions">
      <button
        bind:this={searchButton}
        class="checklist-icon-button"
        class:is-active={showSearch}
        title={showSearch ? 'Close search' : 'Search tasks'}
        aria-label={showSearch ? 'Close search' : 'Search tasks'}
        aria-expanded={showSearch}
        on:click={toggleSearch}><Icon name="search" /></button>
      <button
        class="checklist-icon-button"
        disabled={loading}
        title="Refresh tasks"
        aria-label="Refresh tasks"
        on:click={onRefresh}><Icon name="refresh" /></button>
      <button
        class="checklist-icon-button"
        disabled={!hasGroups}
        on:click={onToggleAll}
        title={allCollapsed ? 'Expand all groups' : 'Collapse all groups'}
        aria-label={allCollapsed ? 'Expand all groups' : 'Collapse all groups'}
        ><Icon name={allCollapsed ? 'expand' : 'collapse'} /></button>
      <button
        bind:this={displayButton}
        class="checklist-icon-button"
        class:is-active={showPopover}
        title="Display options"
        aria-label="Display options"
        aria-expanded={showPopover}
        on:click={() => (showPopover = !showPopover)}
        ><Icon name="settings" /></button>
    </div>
  </div>
  {#if showSearch}
    <div class="checklist-search-wrap">
      <Icon name="search" />
      <input
        bind:this={searchInput}
        class="checklist-search"
        type="text"
        placeholder="Search tasks, notes, tags…"
        aria-label="Search tasks"
        bind:value={search}
        on:input={() => onSearch(search)}
        on:keydown={event => {
          if (event.key === 'Escape') {
            event.stopPropagation()
            toggleSearch()
          }
        }} />
      {#if search}<button
          class="checklist-icon-button"
          title="Clear search"
          aria-label="Clear search"
          on:click={clearSearch}><Icon name="close" /></button
        >{/if}
    </div>
  {/if}
  {#if focusFolder}<button
      class="checklist-filter-chip"
      title="Clear folder filter"
      on:click={() => updateSetting({focusFolder: ''})}
      ><Icon name="file" />{focusFolder}<Icon name="close" /></button
    >{/if}
  {#if hiddenTags.length && todoTags.length}<button
      class="checklist-filter-chip"
      title="Show all configured tags"
      on:click={() => updateSetting({_hiddenTags: []})}
      >{todoTags.length -
        todoTags.filter(tag => hiddenTags.includes(tag)).length} of {todoTags.length}
      tags<Icon name="close" /></button
    >{/if}
  {#if showPopover}
    <div
      class="checklist-display-panel"
      role="group"
      aria-label="Display options">
      <div class="checklist-panel-heading">Group</div>
      <label class="checklist-option"
        >Group by<select
          value={groupBy}
          on:change={event =>
            updateSetting({groupBy: event.currentTarget.value})}
          ><option value="none">None</option><option value="page">Page</option
          ><option value="tag">Tag</option><option value="folder">Folder</option
          ></select
        ></label>
      {#if groupBy !== 'none'}
        <label class="checklist-option"
          >Subgroup by<select
            value={subGroupBy}
            on:change={event =>
              updateSetting({subGroupBy: event.currentTarget.value})}>
            <option value="none">None</option><option
              value="tag"
              disabled={groupBy === 'tag' && subGroupBy === 'none'}>Tag</option>
            <option
              value="page"
              disabled={groupBy === 'page' && subGroupBy === 'none'}
              >Page</option>
            <option
              value="folder"
              disabled={groupBy === 'folder' && subGroupBy === 'none'}
              >Folder</option>
          </select></label>
      {/if}
      <div class="checklist-panel-heading checklist-section-heading">Sort</div>
      <label class="checklist-option"
        >Group order<select
          value={sortDirectionGroups}
          on:change={event =>
            updateSetting({sortDirectionGroups: event.currentTarget.value})}
          >{#each Object.entries(SORT_OPTIONS) as [value, label]}<option {value}
              >{label}</option
            >{/each}<option value="configured">Tag order</option></select
        ></label>
      <label class="checklist-option"
        >Task order<select
          value={sortDirectionItems}
          on:change={event =>
            updateSetting({sortDirectionItems: event.currentTarget.value})}
          ><option value="source">Order in note</option
          >{#each Object.entries(SORT_OPTIONS) as [value, label]}<option {value}
              >{label}</option
            >{/each}</select
        ></label>
      <div class="checklist-panel-heading checklist-section-heading">
        Properties
      </div>
      <label
        class="checklist-option"
        title="Off keeps the previous flat list and task selection. On includes children of tagged tasks and shows their hierarchy.">
        <span>Sub tasks</span><input
          type="checkbox"
          checked={nestSubtasks}
          on:change={event =>
            updateSetting({nestSubtasks: event.currentTarget.checked})} />
      </label>
      <label class="checklist-option"
        ><span>Task count</span><input
          type="checkbox"
          checked={showGroupCounts}
          on:change={event =>
            updateSetting({
              showGroupCounts: event.currentTarget.checked,
            })} /></label>
      <label class="checklist-option"
        ><span>Completed</span><input
          type="checkbox"
          checked={showChecked}
          on:change={event =>
            updateSetting({
              showChecked: event.currentTarget.checked,
            })} /></label>

      <label class="checklist-option"
        ><span
          title="Show the originating note beneath each task, except inside page groups."
          >Source notes</span
        ><input
          type="checkbox"
          checked={showSource}
          on:change={event =>
            updateSetting({showSource: event.currentTarget.checked})} /></label>
      {#if todoTags.length}
        <div class="checklist-panel-heading checklist-tags-heading">Tags</div>
        <div class="checklist-tag-options">
          {#each todoTags as tag}<label class="checklist-option"
              ><span class="checklist-tag-label" title={'#' + tag}>#{tag}</span
              ><input
                type="checkbox"
                checked={!hiddenTags.includes(tag)}
                on:change={event =>
                  onTagStatusChange(tag, event.currentTarget.checked)} /></label
            >{/each}
        </div>
      {/if}
      <div class="checklist-panel-heading checklist-section-heading">
        Filter
      </div>
      <label class="checklist-option checklist-folder-option"
        >Limit to folder<input
          type="text"
          placeholder="All folders"
          aria-label="Limit to folder"
          value={focusFolder}
          on:change={event =>
            updateSetting({
              focusFolder: event.currentTarget.value
                .trim()
                .replace(/^\/+|\/+$/g, ''),
            })} /></label>
      <div class="checklist-option-description">
        Only show tasks from this folder and its subfolders. Leave empty for all
        folders.
      </div>
    </div>
  {/if}
</div>
