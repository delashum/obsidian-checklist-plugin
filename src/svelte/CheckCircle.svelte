<script lang="ts">
  export let checked = false
</script>

<div class="checkbox">
  <div class:checked />
</div>

<style>
  .checkbox {
    width: var(--checklist-checkboxSize);
    height: var(--checklist-checkboxSize);
    min-width: var(--checklist-checkboxSize);
    min-height: var(--checklist-checkboxSize);
    border-radius: 50%;
    border: var(--checklist-checkboxBorder);
    padding: 2px;
    position: relative;
	top: 0.25em
  }

  .checked {
    background-color: var(--text-muted);
    width: var(--checklist-checkboxCheckedSize);
    height: var(--checklist-checkboxCheckedSize);
    border-radius: 50%;
    position: absolute;
    top: calc(calc(var(--checklist-checkboxSize) - var(--checklist-checkboxCheckedSize)) / 4);
    left: calc(calc(var(--checklist-checkboxSize) - var(--checklist-checkboxCheckedSize)) / 4);
  }
</style>
