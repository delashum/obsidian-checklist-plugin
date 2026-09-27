<script lang="ts">
  import type {App} from 'obsidian'
  import type {TodoGroup, TodoItem, GroupByType} from 'src/_types'
  import type {TodoSettings} from 'src/settings'
  import ChecklistGroup from './ChecklistGroup.svelte'
  import Header from './Header.svelte'
  import type {SortDirection} from 'src/_types'
  export let todoTags: string[]
  export let groupBy: GroupByType
  export let animateCompletion: boolean
  export let showChecked: boolean
  export let showOnlyActiveFile: boolean
  export let showGroupCounts: boolean
  export let showSource: boolean
  export let subGroupBy: GroupByType
  export let nestSubtasks: boolean
  export let sortDirectionGroups: SortDirection
  export let sortDirectionItems: SortDirection
  export let focusFolder: string
  export let totalCount: number
  export let hasMore: boolean
  export let loading: boolean
  export let failedCount: number
  export let onLoadMore: () => void
  export let onRefresh: () => Promise<void>
  export let onToggleTask: (item: TodoItem) => Promise<void>
  export let _collapsedSections: string[]
  export let _hiddenTags: string[]
  export let updateSetting: (updates: Partial<TodoSettings>) => Promise<void>
  export let onSearch: (str: string) => void
  export let useTasksPlugin = false
  export let app: App
  export let todoGroups: TodoGroup[] = []
  let search = ''
  $: visibleTags = todoTags.filter(tag => !_hiddenTags.includes(tag))
  const groupIds = (groups: TodoGroup[]): string[] =>
    groups.flatMap(group => [group.id, ...groupIds(group.groups ?? [])])
  $: allCollapsed =
    todoGroups.length > 0 &&
    todoGroups.every(group => _collapsedSections.includes(group.id))
  const toggleGroup = (id: string) =>
    updateSetting({
      _collapsedSections: _collapsedSections.includes(id)
        ? _collapsedSections.filter(value => value !== id)
        : [..._collapsedSections, id],
    })
  const toggleAll = () => {
    const ids = groupIds(todoGroups)
    updateSetting({
      _collapsedSections: allCollapsed
        ? _collapsedSections.filter(id => !ids.includes(id))
        : [...new Set([..._collapsedSections, ...ids])],
    })
  }
  const updateTagStatus = (tag: string, visible: boolean) =>
    updateSetting({
      _hiddenTags: visible
        ? _hiddenTags.filter(value => value !== tag)
        : [...new Set([..._hiddenTags, tag])],
    })
</script>

<div class="checklist-plugin-main markdown-preview-view">
  <Header
    bind:search
    {todoTags}
    hiddenTags={_hiddenTags}
    {groupBy}
    {showChecked}
    {animateCompletion}
    {showOnlyActiveFile}
    {showGroupCounts}
    {showSource}
    taskCount={totalCount}
    {subGroupBy}
    {nestSubtasks}
    {sortDirectionGroups}
    {sortDirectionItems}
    {focusFolder}
    {loading}
    {onRefresh}
    {allCollapsed}
    hasGroups={groupBy !== 'none' && todoGroups.length > 0}
    onToggleAll={toggleAll}
    {updateSetting}
    onTagStatusChange={updateTagStatus}
    onSearch={value => {
      search = value
      onSearch(value)
    }} />
  {#if failedCount}<div class="checklist-status" role="status">
      {failedCount}
      {failedCount === 1 ? 'note could' : 'notes could'} not be read.
      <button on:click={onRefresh}>Retry</button>
    </div>{/if}
  {#if todoGroups.length === 0}
    <div class="checklist-empty" role="status">
      <span class="checklist-empty-title"
        >{loading
          ? 'Loading tasks…'
          : search
          ? 'No matching tasks'
          : 'No tasks to show'}</span>
      <span
        >{#if search}Try another search or clear the filter.{:else if todoTags.length > 0 && visibleTags.length === 0}All
          tags are hidden. Choose a tag in Display options.{:else if showOnlyActiveFile}No
          matching tasks in the current note.{:else if visibleTags.length}Add
          tasks tagged {visibleTags
            .map(tag => '#' + tag)
            .join(', ')}.{:else}Tasks from your notes will appear here.{/if}</span>
    </div>
  {:else}
    {#each todoGroups as group (group.id)}<ChecklistGroup
        {group}
        {app}
        {useTasksPlugin}
        {showGroupCounts}
        {showSource}
        collapsed={_collapsedSections}
        onToggle={toggleGroup}
        {onToggleTask}
        onTagClick={tag => {
          search = tag
          onSearch(tag)
        }} />{/each}
  {/if}
  {#if hasMore}<button
      class="checklist-load-more"
      disabled={loading}
      on:click={onLoadMore}>Show more tasks</button
    >{/if}
</div>
