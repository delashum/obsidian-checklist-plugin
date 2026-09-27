<script lang="ts">
  export let checked = false
</script>

<svg
  class="checklist-check-circle"
  class:checked
  viewBox="0 0 20 20"
  aria-hidden="true"
  ><circle cx="10" cy="10" r="7.25" />{#if checked}<path
      d="m6.5 10 2.25 2.25 4.75-4.75" />{/if}</svg>

<style>
  .checklist-check-circle {
    width: 18px;
    height: 18px;
    display: block;
    flex: none;
  }
  circle {
    fill: none;
    stroke: var(--text-faint);
    stroke-width: 1.5;
  }
  .checked circle {
    fill: var(--interactive-accent);
    stroke: var(--interactive-accent);
  }
  path {
    fill: none;
    stroke: var(--text-on-accent);
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
