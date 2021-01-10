<script lang="ts">
    import type { App } from "obsidian";
    import {
        toggleTodoItem,
        parseTodosFromFiles,
        getFileFromPath,
        isMetaPressed,
    } from "src/_utils";
    import type { FileTodos, TodoItem } from "src/_types";
    import { toggle_class } from "svelte/internal";
    import CheckCircle from "./CheckCircle.svelte";

    export let todoLinkId: string;
    let files: FileTodos[] = [];
    const app: App = (window as any).app;

    function reload() {
        files = parseTodosFromFiles(
            app.vault.getFiles(),
            todoLinkId,
            app.metadataCache
        );
        console.log(files);
    }

    function toggleItem(item: TodoItem) {
        toggleTodoItem(item, app);
        item.checked = !item.checked;
        files = [...files];
        console.log("toggled", item);
    }

    async function navToFile(path: string, split: boolean) {
        const file = getFileFromPath(path, app);
        const leaf = split
            ? app.workspace.splitActiveLeaf()
            : app.workspace.getUnpinnedLeaf();
        await leaf.openFile(file);
    }
</script>

<style>
    .todo-item {
        display: flex;
        align-items: center;
        gap: 4px;
        background-color: var(--interactive-normal);
        border-radius: 8px;
        padding: 8px;
        margin-bottom: 16px;
        cursor: pointer;
        transition: background-color 250ms ease-in-out;
    }

    .todo-item:hover {
        background-color: var(--interactive-hover);
    }

    .todo-text {
        margin-left: 8px;
    }

    .file-link {
        margin-bottom: 4px;
        color: var(--color-accent);
        transition: opacity 150ms ease-in-out;
    }

    .file-link:hover {
        cursor: pointer;
        opacity: 0.8;
    }
</style>

<div>
    <div class="todo-list">
        {#each files as file}
            <div
                class="file-link"
                on:click={(e) => navToFile(file.path, isMetaPressed(e))}>
                {file.name}
            </div>
            {#each file.todos as todo}
                <div class="todo-item" on:click={() => toggleItem(todo)}>
                    <CheckCircle checked={todo.checked} />
                    <div class="todo-text">{todo.text}</div>
                </div>
            {/each}
        {/each}
    </div>
</div>
