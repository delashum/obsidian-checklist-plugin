<script lang="ts">
  import type {App} from 'obsidian'
  import {Keymap} from 'obsidian'
  import type {TodoItem} from 'src/_types'
  import {navToFile} from 'src/utils'
  import Icon from './Icon.svelte'
  import {TASK_COMPLETION_DELAY_MS} from 'src/constants'
  export let item: TodoItem
  export let showSource = false
  export let useTasksPlugin = false
  export let onTagClick: (tag: string) => void
  export let app: App
  export let onToggleTask: (item: TodoItem) => Promise<void>
  let checkbox: HTMLInputElement
  let contentDiv: HTMLDivElement
  let busy = false
  let expanded = true
  // Set the negative delay once per completion, not on every metadata rerender.
  // Updating an active animation's delay would jump its playhead forward.
  function completionProgress(node: HTMLElement, deadline: number | undefined) {
    let previous: number | undefined
    const update = (value: number | undefined) => {
      if (value === previous) return
      previous = value
      node.style.setProperty(
        '--completion-duration',
        `${TASK_COMPLETION_DELAY_MS}ms`,
      )
      node.style.setProperty(
        '--completion-delay',
        `${
          value ? Math.min(0, value - Date.now() - TASK_COMPLETION_DELAY_MS) : 0
        }ms`,
      )
    }
    update(deadline)
    return {update}
  }
  async function toggle() {
    if (busy) return
    busy = true
    try {
      await onToggleTask(item)
    } finally {
      busy = false
      checkbox.checked = item.checked
    }
  }
  const handleClick = (event: MouseEvent) => {
    const target = (event.target as HTMLElement).closest('a')
    if (target) {
      event.stopPropagation()
      if (target.dataset.type === 'tag') {
        event.preventDefault()
        onTagClick(target.textContent)
        return
      }
      if (target.dataset.type === 'link') {
        event.preventDefault()
        app.workspace.openLinkText(
          target.dataset.filepath,
          item.filePath,
          !!Keymap.isModEvent(event),
        )
      }
      return
    }
    navToFile(app, item.filePath, event, item.line)
  }
  $: if (contentDiv) contentDiv.innerHTML = item.rawHTML
</script>

<li class="checklist-task" class:is-completed={item.checked}>
  <div
    class="checklist-task-row"
    class:is-completing={!!item.completionExpiresAt}
    use:completionProgress={item.completionExpiresAt}>
    <label class="checklist-task-toggle">
      <span class="checklist-sr-only"
        >{(item.checked ? 'Mark incomplete: ' : 'Complete: ') +
          item.originalText}</span>
      <input
        type="checkbox"
        class="task-list-item-checkbox"
        bind:this={checkbox}
        checked={item.checked}
        disabled={busy}
        on:change={toggle} />
    </label>
    <div class="checklist-task-body">
      <div class="checklist-task-line">
        <div
          bind:this={contentDiv}
          class="checklist-task-content"
          role="link"
          tabindex="0"
          on:click={handleClick}
          on:keydown={event => {
            if (event.key === 'Enter' && event.target === event.currentTarget) {
              event.preventDefault()
              navToFile(app, item.filePath, event, item.line)
            }
          }} />
        {#if item.children.length}
          <button
            class="checklist-children-toggle"
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${
              item.children.length
            } ${item.children.length === 1 ? 'subtask' : 'subtasks'}`}
            on:click={() => (expanded = !expanded)}
            ><span>{item.children.length}</span><Icon
              name="chevron"
              direction={expanded ? 'down' : 'right'} /></button>
        {/if}
      </div>
      {#if showSource}<button
          class="checklist-source"
          title={item.filePath}
          on:click={event => navToFile(app, item.filePath, event, item.line)}
          ><Icon name="file" /><span>{item.filePath.replace(/\.md$/, '')}</span
          ></button
        >{/if}
    </div>
  </div>
  {#if item.children.length}
    {#if expanded}<ul class="checklist-items checklist-children">
        {#each item.children as child (child.filePath + ':' + child.line)}<svelte:self
            item={child}
            {app}
            {onToggleTask}
            {onTagClick}
            {useTasksPlugin} />{/each}
      </ul>{/if}
  {/if}
</li>
