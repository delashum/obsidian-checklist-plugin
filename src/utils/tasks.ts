import MD from "markdown-it";
import minimatch from "minimatch";
import { getAPI, STask } from "obsidian-dataview";

import { commentPlugin } from "../plugins/comment";
import { highlightPlugin } from "../plugins/highlight";
import { linkPlugin } from "../plugins/link";
import { tagPlugin } from "../plugins/tag";
import {
	combineFileLines,
	extractTextFromTodoLine,
	getAllLinesFromFile,
	getAllTagsFromMetadata,
	getFileFromPath,
	getFileLabelFromName,
	getFrontmatterTags,
	getIndentationSpacesFromTodoLine,
	getTagMeta,
	retrieveTag,
	lineIsValidTodo,
	mapLinkMeta,
	removeTagFromText,
	setLineTo,
	todoLineIsChecked,
} from "./helpers";

import type {
	App,
	LinkCache,
	MetadataCache,
	TagCache,
	TFile,
	Vault,
} from "obsidian";
import type { TodoItem, TagMeta, FileInfo } from "src/_types";


 const md = new MD().use(commentPlugin).use(tagPlugin).use(highlightPlugin)
 const dv = getAPI();

 const mapper = (vault: Vault) => {

  
	// if (!currentFileLines[item.line].includes(item.originalText)) return;
  return async (task: STask): Promise<TodoItem> => {
    const dv = getAPI();
    const file = getFileFromPath(vault, task.path);
    if (!file) return;
    const currentFileContents = await vault.read(file);
    const currentFileLines = getAllLinesFromFile(currentFileContents);
    return {
      checked: todoLineIsChecked(currentFileLines[task.line]),
      originalText: task.text,
      file: dv.page(task.path).file,
      line: task.line,
      children: await Promise.all(task.children.map(mapper(vault))),
      html: md.render(task.text).trimEnd().replace(/\n/gm, "<br>")
    }
  }
}

/**
 * Finds all of the {@link TodoItem todos} in the {@link TFile files} that have been updated since the last re-render.
 *
 * @param files The files to search for todos.
 * @param todoTags The tag(s) that should be present on todos in order to be displayed by this plugin.
 * @param cache The Obsidian {@link MetadataCache} object.
 * @param vault The Obsidian {@link Vault} object.
 * @param includeFiles The pattern of files to include in the search for todos.
 * @param showChecked Whether the user wants to show completed todos in the plugin's UI.
 * @param lastRerender Timestamp of the last time we re-rendered the checklist.
 * @returns A map containing each {@link TFile file} that was updated, and the {@link TodoItem todos} in that file.
 * If there are no todos in a file, that file will still be present in the map, but the value for its entry will be an
 * empty array. This is required to account for the case where a file that previously had todos no longer has any.
 */

export const parseTodos = async (
	files: TFile[],
	todoTags: string[],
	cache: MetadataCache,
	vault: Vault,
	includeFiles: string,
	showChecked: boolean,
	showAllTodos: boolean,
	lastRerender: number
): Promise<Map<TFile, TodoItem[]>> => {
	const includePattern = includeFiles.trim()
		? includeFiles.trim().split("\n")
		: ["**/*"];
	/* await Promise.all(
		files
			.filter((file) => {
				if (file.stat.mtime < lastRerender) return false;
				if (!includePattern.some((p) => minimatch(file.path, p))) return false;
				if (todoTags.length === 1 && todoTags[0] === "*") return true;
				const fileCache = cache.getFileCache(file);
				const allTags = getAllTagsFromMetadata(fileCache);
				const tagsOnPage = allTags.filter((tag) =>
					todoTags.includes(retrieveTag(getTagMeta(tag)).toLowerCase())
				);
				return tagsOnPage.length > 0;
			})
	); */

	const todosForUpdatedFiles = new Map<TFile, TodoItem[]>();
	/* for (const fileInfo of filesWithCache) {
		let todos = findAllTodosInFile(fileInfo);
		if (!showChecked) {
			todos = todos.filter((todo) => !todo.checked);
		}
		todosForUpdatedFiles.set(fileInfo.file, todos);
	} */
	const dv = getAPI();

	for (const page of files) {
		const current = dv.page(page.path)?.file
		// console.log("currrr", current, page)
		if(!current) continue
		let tsk = await Promise.all(current.tasks.filter(b => !b.parent).map(mapper(vault)))
        console.log("calling mapper", Array.from(tsk))
		todosForUpdatedFiles.set(page,tsk)
	}
	console.log(todosForUpdatedFiles)
	return todosForUpdatedFiles;

};

export const toggleTodoItem = async (item: TodoItem, app: App) => {
	const file = getFileFromPath(app.vault, item.file.path);
	if (!file) return;
	const currentFileContents = await app.vault.read(file);
	const currentFileLines = getAllLinesFromFile(currentFileContents);
	if (!currentFileLines[item.line].includes(item.originalText)) return;
	const newData = setTodoStatusAtLineTo(
		currentFileLines,
		item.line,
		!item.checked
	);
  console.log
	item.checked = !item.checked;
	await app.vault.modify(file, newData);
};



const setTodoStatusAtLineTo = (
	fileLines: string[],
	line: number,
	setTo: boolean
) => {
	fileLines[line] = setLineTo(fileLines[line], setTo);
	return combineFileLines(fileLines);
};
