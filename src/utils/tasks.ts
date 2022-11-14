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
import type { TodoItem, TagMeta, FileInfo, mapFn } from "src/_types";


 const md = new MD().use(commentPlugin).use(tagPlugin).use(highlightPlugin)
 // @ts-ignore it exists shhhhhhhhhhhhhhh
 const dv = window.app.plugins.plugins["dataview"].api

 const mapper: mapFn  = (vault: Vault, showChecked: boolean = true) => {
	// if (!currentFileLines[item.line].includes(item.originalText)) return;
  return async (task: STask): Promise<TodoItem> => {
    const dv = getAPI();
    const file = getFileFromPath(vault, task.path);
    if (!file) return;
    const currentFileContents = await vault.read(file);
    const currentFileLines = getAllLinesFromFile(currentFileContents);
    const dvp = dv.page(task.path)
    const dvpt = dvp.file.tags.map(a => a.replaceAll("#", ""))
    return {
      checked: todoLineIsChecked(currentFileLines[task.line]),
      originalText: task.text,
      file: dvp.file,
      line: task.line,
      children: await Promise.all(task.children.filter(a => showChecked ? true : !a.checked).map(mapper(vault))),
      html: md.render(task.text).trimEnd().replace(/\n/gm, "<br>"),
      mainTag: dvpt[0].split("/")[0],
      subTag: dvpt[0].split("/")[1] || null
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
  const query = `(${includeFiles.split("\n").map(a => '"' + (a || "/") + '"').join(" or ")})${todoTags.length ? " and (" + todoTags.map(a => "#" + a).join(" ") + ")" : ""}`
	for (const page of dv.pages(query)) {
		let current = page.file
		console.log("currrr",  page)
		let tsk = await Promise.all(current.tasks.filter(b => !b.parent).filter(a => showChecked ? true : !a.checked).map(mapper(vault, showChecked)))
		  todosForUpdatedFiles.set(vault.getAbstractFileByPath(page.file.path) as TFile,Array.from(tsk))
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
