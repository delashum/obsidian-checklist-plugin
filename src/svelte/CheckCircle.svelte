<script lang="ts">
    export let checked = false;
</script>

<style>
    .checkbox {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid var(--text-muted);
        padding: 2px;
        position: relative;
        min-width: 20px;
        min-height: 20px;
    }

    .checked {
        background-color: var(--text-muted);
        width: 12px;
        height: 12px;
        border-radius: 50%;
        position: absolute;
        top: 2px;
        left: 2px;
    }
</style>

<div class="checkbox">
    <div class:checked />
</div>
