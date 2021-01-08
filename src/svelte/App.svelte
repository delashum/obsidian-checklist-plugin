<script lang="ts">
    import type { App } from "obsidian";
    import type { TodoItem } from "src/_types";
    import { onMount } from "svelte";
    import { parseTodosFromFiles } from "../utils/parse-files";

    export let todoLinkId: string;
    let todos: TodoItem[] = [];
    const app: App = (window as any).app;

    function reload() {
        todos = parseTodosFromFiles(
            app.vault.getFiles(),
            todoLinkId,
            app.metadataCache
        );
    }
    console.log(todos);
</script>

<style>
</style>

<div>
    {#each todos as todo}
        <div>{todo.text}</div>
    {/each}
    <button on:click={reload}>fetch todos</button>
</div>
