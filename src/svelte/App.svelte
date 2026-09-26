<script lang="ts">
  import type { App } from 'obsidian'
  import type { LookAndFeel, TodoGroup, GroupByType } from 'src/_types'
  import type { TodoSettings } from 'src/settings'
  import ChecklistGroup from './ChecklistGroup.svelte'
  import Header from './Header.svelte'
  export let todoTags: string[]
  export let lookAndFeel: LookAndFeel
  export let groupBy: GroupByType
  export let showChecked: boolean
  export let showOnlyActiveFile: boolean
  export let showSource: boolean
  export let _collapsedSections: string[]
  export let _hiddenTags: string[]
  export let updateSetting: (updates: Partial<TodoSettings>) => Promise<void>
  export let onSearch: (str: string) => void
  export let app: App
  export let todoGroups: TodoGroup[] = []
  let search = ''
  $: visibleTags = todoTags.filter(tag => !_hiddenTags.includes(tag))
  $: taskCount = todoGroups.reduce((count, group) => count + group.todos.length, 0)
  $: allCollapsed = todoGroups.length > 0 && todoGroups.every(group => _collapsedSections.includes(group.id))
  const toggleGroup = (id: string) => updateSetting({_collapsedSections: _collapsedSections.includes(id) ? _collapsedSections.filter(value => value !== id) : [..._collapsedSections, id]})
  const toggleAll = () => {
    const ids = todoGroups.map(group => group.id)
    updateSetting({_collapsedSections: allCollapsed ? _collapsedSections.filter(id => !ids.includes(id)) : [...new Set([..._collapsedSections, ...ids])]})
  }
  const updateTagStatus = (tag: string, visible: boolean) => updateSetting({_hiddenTags: visible ? _hiddenTags.filter(value => value !== tag) : [...new Set([..._hiddenTags, tag])]})
</script>

<div class="checklist-plugin-main markdown-preview-view" class:checklist-compact={lookAndFeel === 'compact'}>
  <Header {todoTags} hiddenTags={_hiddenTags} {groupBy} {showChecked} {showOnlyActiveFile} {showSource} {lookAndFeel} {taskCount} {allCollapsed} hasGroups={todoGroups.length > 0} onToggleAll={toggleAll} {updateSetting} onTagStatusChange={updateTagStatus} onSearch={(value) => { search = value; onSearch(value) }} />
  {#if todoGroups.length === 0}
    <div class="checklist-empty" role="status">
      <span class="checklist-empty-title">{search ? 'No matching tasks' : 'No tasks to show'}</span>
      <span>{#if search}Try another search or clear the filter.{:else if todoTags.length > 0 && visibleTags.length === 0}All tags are hidden. Choose a tag in Display options.{:else if showOnlyActiveFile}No matching tasks in the current note.{:else if visibleTags.length}Add tasks tagged {visibleTags.map(tag => '#' + tag).join(', ')}.{:else}Tasks from your notes will appear here.{/if}</span>
    </div>
  {:else}
    {#each todoGroups as group (group.id)}<ChecklistGroup {group} {app} {showSource} isCollapsed={_collapsedSections.includes(group.id)} onToggle={toggleGroup} />{/each}
  {/if}
</div>
