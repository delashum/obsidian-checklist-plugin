<script lang="ts">
  import type { App } from 'obsidian'
  import type { TodoItem } from 'src/_types'
  import { navToFile, toggleTodoItem } from 'src/utils'
  import CheckCircle from './CheckCircle.svelte'
  import Icon from './Icon.svelte'
  export let item: TodoItem
  export let showSource = false
  export let app: App
  let contentDiv: HTMLDivElement
  const handleClick = (event: MouseEvent) => {
    const target = (event.target as HTMLElement).closest('a')
    if (target) {
      event.stopPropagation()
      if (target.dataset.type === 'link') navToFile(app, target.dataset.filepath, event)
      return
    }
    navToFile(app, item.filePath, event, item.line)
  }
  $: if (contentDiv) contentDiv.innerHTML = item.rawHTML
</script>

<li class="checklist-task" class:is-completed={item.checked}>
  <button class="checklist-task-toggle" aria-label={(item.checked ? 'Mark incomplete: ' : 'Complete: ') + item.originalText} aria-pressed={item.checked} on:click|stopPropagation={() => toggleTodoItem(item, app)}><CheckCircle checked={item.checked} /></button>
  <div class="checklist-task-body">
    <div bind:this={contentDiv} class="checklist-task-content" role="link" tabindex="0" on:click={handleClick} on:keydown={(event) => { if (event.key === 'Enter' && event.target === event.currentTarget) { event.preventDefault(); navToFile(app, item.filePath, event, item.line) } }} />
    {#if showSource}<button class="checklist-source" title={item.filePath} on:click={(event) => navToFile(app, item.filePath, event, item.line)}><Icon name="file" /><span>{item.fileLabel}</span></button>{/if}
  </div>
</li>
