<script lang="ts">
  import type { Icon } from "src/_types"

  export let name: Icon
  export let direction: "up" | "down" | "left" | "right" = "down"
</script>

{#if name === "chevron"}
  <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512" class={`svg ${direction}`}
    ><path
      d="M119.5 326.9L3.5 209.1c-4.7-4.7-4.7-12.3 0-17l7.1-7.1c4.7-4.7 12.3-4.7 17 0L128 287.3l100.4-102.2c4.7-4.7 12.3-4.7 17 0l7.1 7.1c4.7 4.7 4.7 12.3 0 17L136.5 327c-4.7 4.6-12.3 4.6-17-.1z"
    /></svg
  >
{/if}

<style>
  .svg {
    width: var(--todoList-iconSize);
    height: var(--todoList-iconSize);
    fill: var(--text-normal);
    transition: transform 150ms ease;
    cursor: pointer;
  }

  .up {
    transform: rotate(180deg);
  }
  .down {
    transform: rotate(0deg);
  }
  .left {
    transform: rotate(90deg);
  }
  .right {
    transform: rotate(270deg);
  }
</style>
