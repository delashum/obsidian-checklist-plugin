<script lang="ts">
    export let checked = false;
</script>

<style>
    .checkbox {
        width: var(--todoList-checkboxSize);
        height: var(--todoList-checkboxSize);
        min-width: var(--todoList-checkboxSize);
        min-height: var(--todoList-checkboxSize);
        border-radius: 50%;
        border: var(--todoList-checkboxBorder);
        padding: 2px;
        position: relative;
    }

    .checked {
        background-color: var(--text-muted);
        width: var(--todoList-checkboxCheckedSize);
        height: var(--todoList-checkboxCheckedSize);
        border-radius: 50%;
        position: absolute;
        top: calc(calc(var(--todoList-checkboxSize) - var(--todoList-checkboxCheckedSize)) / 4);
        left: calc(calc(var(--todoList-checkboxSize) - var(--todoList-checkboxCheckedSize)) / 4);
    }
</style>

<div class="checkbox">
    <div class:checked />
</div>
