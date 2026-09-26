<script lang="ts">
  import type {App} from 'obsidian'
  import {Keymap} from 'obsidian'
  import type {TodoItem} from 'src/_types'
  import {navToFile, toggleTodoItem} from 'src/utils'
  import CheckCircle from './CheckCircle.svelte'
  import Icon from './Icon.svelte'
  export let item: TodoItem
  export let showSource = false
  export let useTasksPlugin = false
  export let onTagClick: (tag: string) => void
  export let app: App
  export let onTaskChanged: (path: string) => Promise<void>
  let contentDiv: HTMLDivElement
  let busy = false
  let expanded = true
  async function toggle() {
    if (busy) return
    busy = true
    try {
      await toggleTodoItem(item, app, useTasksPlugin)
      item = item
      await onTaskChanged(item.filePath)
    } finally {
      busy = false
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
  <div class="checklist-task-row">
    <button
      class="checklist-task-toggle"
      disabled={busy}
      aria-label={(item.checked ? 'Mark incomplete: ' : 'Complete: ') +
        item.originalText}
      aria-pressed={item.checked}
      on:click|stopPropagation={toggle}
      ><CheckCircle checked={item.checked} /></button>
    <div class="checklist-task-body">
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
      {#if showSource}<button
          class="checklist-source"
          title={item.filePath}
          on:click={event => navToFile(app, item.filePath, event, item.line)}
          ><Icon name="file" /><span>{item.filePath.replace(/\.md$/, '')}</span
          ></button
        >{/if}
      {#if item.children.length}
        <button
          class="checklist-children-toggle"
          aria-expanded={expanded}
          on:click={() => (expanded = !expanded)}
          ><Icon name="chevron" direction={expanded ? 'down' : 'right'} />{item
            .children.length}
          {item.children.length === 1 ? 'subtask' : 'subtasks'}</button>
      {/if}
    </div>
  </div>
  {#if item.children.length}
    {#if expanded}<ul class="checklist-items checklist-children">
        {#each item.children as child (child.filePath + ':' + child.line)}<svelte:self
            item={child}
            {app}
            {onTaskChanged}
            {onTagClick}
            {useTasksPlugin} />{/each}
      </ul>{/if}
  {/if}
</li>
