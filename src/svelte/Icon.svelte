<script lang="ts">
  import type { Icon } from "src/_types"
  import { createEventDispatcher } from "svelte"

  export let name: Icon
  export let direction: "up" | "down" | "left" | "right" = "down"
  export let style: "static" | "button" = "static"

  const onClickDispatcher = createEventDispatcher()

  const onClick = (ev: any) => {
    onClickDispatcher("click", ev)
  }
</script>

{#if name === "chevron"}
  <svg
    focusable="false"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 256 512"
    class={`svg ${direction} ${style}`}
    on:click={onClick}
    ><path
      d="M119.5 326.9L3.5 209.1c-4.7-4.7-4.7-12.3 0-17l7.1-7.1c4.7-4.7 12.3-4.7 17 0L128 287.3l100.4-102.2c4.7-4.7 12.3-4.7 17 0l7.1 7.1c4.7 4.7 4.7 12.3 0 17L136.5 327c-4.7 4.6-12.3 4.6-17-.1z"
    /></svg
  >
{:else if name === "settings"}
  <svg viewBox="0 0 100 100" width="18" height="18" class={`svg settings ${style}`} on:click={onClick}
    ><path
      d="M44.4,4c-1,0-1.8,0.7-2,1.7l-1.9,11.9c-2.3,0.7-4.6,1.6-6.7,2.7l-9.8-7c-0.8-0.6-1.9-0.5-2.6,0.2l-7.8,7.8 c-0.7,0.7-0.8,1.8-0.2,2.6l6.9,9.9c-1.2,2.1-2.1,4.4-2.8,6.7l-11.9,2c-1,0.2-1.7,1-1.7,2v11c0,1,0.7,1.8,1.6,2l11.9,2.1 c0.7,2.4,1.6,4.6,2.8,6.7l-7,9.8c-0.6,0.8-0.5,1.9,0.2,2.6l7.8,7.8c0.7,0.7,1.8,0.8,2.6,0.2l9.9-6.9c2.1,1.2,4.3,2.1,6.7,2.8 l2,11.9c0.2,1,1,1.7,2,1.7h11c1,0,1.8-0.7,2-1.7l2.1-12c2.3-0.7,4.6-1.6,6.7-2.8l10,7c0.8,0.6,1.9,0.5,2.6-0.2l7.8-7.8 c0.7-0.7,0.8-1.8,0.2-2.6l-7.1-9.9c1.1-2.1,2.1-4.3,2.7-6.6l12-2.1c1-0.2,1.7-1,1.7-2v-11c0-1-0.7-1.8-1.7-2l-12-2 c-0.7-2.3-1.6-4.5-2.7-6.6l7-10c0.6-0.8,0.5-1.9-0.2-2.6l-7.8-7.8c-0.7-0.7-1.8-0.8-2.6-0.2l-9.8,7.1c-2.1-1.2-4.3-2.1-6.7-2.8 l-2.1-12c-0.2-1-1-1.7-2-1.7L44.4,4z M46.1,8h7.6l2,11.4c0.1,0.8,0.7,1.4,1.5,1.6c2.9,0.7,5.7,1.9,8.2,3.4 c0.7,0.4,1.6,0.4,2.2-0.1l9.4-6.7l5.4,5.4l-6.7,9.5c-0.5,0.6-0.5,1.5-0.1,2.2c1.5,2.5,2.6,5.2,3.4,8.1c0.2,0.8,0.8,1.4,1.6,1.5 L92,46.1v7.6l-11.4,2c-0.8,0.1-1.4,0.7-1.6,1.5c-0.7,2.9-1.9,5.6-3.4,8.1c-0.4,0.7-0.4,1.6,0.1,2.2l6.8,9.4l-5.4,5.4l-9.5-6.7 c-0.7-0.5-1.5-0.5-2.2-0.1c-2.5,1.5-5.2,2.7-8.2,3.4c-0.8,0.2-1.3,0.8-1.5,1.6l-2,11.4h-7.6l-1.9-11.3c-0.1-0.8-0.7-1.4-1.5-1.6 c-2.9-0.7-5.7-1.9-8.2-3.4c-0.7-0.4-1.5-0.4-2.2,0.1l-9.4,6.6l-5.4-5.4l6.6-9.3c0.5-0.7,0.5-1.5,0.1-2.2c-1.5-2.5-2.7-5.3-3.4-8.2 c-0.2-0.8-0.8-1.3-1.6-1.5L8,53.7v-7.6l11.3-1.9c0.8-0.1,1.4-0.7,1.6-1.5c0.7-2.9,1.9-5.7,3.4-8.2c0.4-0.7,0.4-1.5-0.1-2.2 l-6.6-9.4l5.4-5.4l9.3,6.7c0.6,0.5,1.5,0.5,2.2,0.1c2.5-1.5,5.3-2.7,8.2-3.4c0.8-0.2,1.4-0.8,1.5-1.6L46.1,8z M50,34 c-8.8,0-16,7.2-16,16s7.2,16,16,16s16-7.2,16-16S58.8,34,50,34z M50,38c6.7,0,12,5.3,12,12s-5.3,12-12,12s-12-5.3-12-12 S43.3,38,50,38z"
    /></svg
  >
{/if}

<style>
  .svg {
    width: var(--checklist-iconSize);
    height: var(--checklist-iconSize);
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

  .button {
    fill: var(--checklist-iconFill--accent);
    transition: fill 150ms ease;
  }

  .button:hover {
    fill: var(--checklist-textColor);
  }

  .static {
    fill: var(--checklist-iconFill);
  }
</style>
