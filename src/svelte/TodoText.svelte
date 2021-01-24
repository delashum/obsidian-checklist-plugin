<script lang="ts">
  import { navToFile, hoverFile } from "src/_utils"
  import type { TodoDisplayChunk } from "src/_types"
  import type { App } from "obsidian"
  import TodoText from "./TodoText.svelte"

  export let chunks: TodoDisplayChunk[]

  const app: App = (window as any).app
</script>

{#each chunks as chunk}
  {#if chunk.type === "text"}
    <span>{chunk.content}</span>
  {:else if chunk.type === "bold"}
    <span class="bold-item"><TodoText chunks={chunk.content} /></span>
  {:else if chunk.type === "italic"}
    <span class="italic-item"><TodoText chunks={chunk.content} /></span>
  {:else if chunk.type === "link"}
    <span
      class="link-item"
      on:click={(ev) => {
        ev.stopPropagation()
        navToFile(chunk.filePath, ev)
      }}
      on:mouseenter={(ev) => {
        hoverFile(ev, app, chunk.filePath)
      }}><TodoText chunks={chunk.content} /></span
    >
  {/if}
{/each}

<style>
  .link-item {
    color: var(--text-accent);
    text-decoration: underline;
    cursor: pointer;
    transition: color 150ms ease-in-out;
  }
  .link-item:hover {
    color: var(--text-accent-hover);
  }
  .bold-item {
    font-weight: bold;
  }
  .italic-item {
    font-style: italic;
  }
</style>
