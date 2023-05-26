import MD from "markdown-it";
import { Minimatch } from "minimatch";

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
  const filesWithCache = await Promise.all(
    files
      .filter((file) => {
        if (file.stat.mtime < lastRerender) return false;

        var mm = new Minimatch(file.path);
        if (!includePattern.some((p) => mm.match(p))) return false;
        if (todoTags.length === 1 && todoTags[0] === "*") return true;
        const fileCache = cache.getFileCache(file);
        const allTags = getAllTagsFromMetadata(fileCache);
        const tagsOnPage = allTags.filter((tag) =>
          todoTags.includes(retrieveTag(getTagMeta(tag)).toLowerCase())
        );
        return tagsOnPage.length > 0;
      })
      .map<Promise<FileInfo>>(async (file) => {
        const fileCache = cache.getFileCache(file);
        const tagsOnPage =
          fileCache?.tags?.filter((e) =>
            todoTags.includes(retrieveTag(getTagMeta(e.tag)).toLowerCase())
          ) ?? [];
        const frontMatterTags = getFrontmatterTags(fileCache, todoTags);
        const hasFrontMatterTag = frontMatterTags.length > 0;
        const parseEntireFile =
          todoTags[0] === "*" || hasFrontMatterTag || showAllTodos;
        const content = await vault.cachedRead(file);
        return {
          content,
          cache: fileCache,
          validTags: tagsOnPage.map((e) => ({
            ...e,
            tag: e.tag.toLowerCase(),
          })),
          file,
          parseEntireFile,
          frontmatterTag: todoTags.length ? frontMatterTags[0] : undefined,
        };
      })
  );

  const todosForUpdatedFiles = new Map<TFile, TodoItem[]>();
  for (const fileInfo of filesWithCache) {
    let todos = findAllTodosInFile(fileInfo);
    if (!showChecked) {
      todos = todos.filter((todo) => !todo.checked);
    }
    todosForUpdatedFiles.set(fileInfo.file, todos);
  }

  return todosForUpdatedFiles;
};

export const toggleTodoItem = async (item: TodoItem, app: App) => {
  const file = getFileFromPath(app.vault, item.filePath);
  if (!file) return;
  const currentFileContents = await app.vault.read(file);
  const currentFileLines = getAllLinesFromFile(currentFileContents);
  if (!currentFileLines[item.line].includes(item.originalText)) return;
  const newData = setTodoStatusAtLineTo(
    currentFileLines,
    item.line,
    !item.checked
  );
  app.vault.modify(file, newData);
  item.checked = !item.checked;
};

const findAllTodosInFile = (file: FileInfo): TodoItem[] => {
  if (!file.parseEntireFile)
    return file.validTags.flatMap((tag) => findAllTodosFromTagBlock(file, tag));

  if (!file.content) return [];
  const fileLines = getAllLinesFromFile(file.content);
  const links = [];
  if (file.cache?.links) {
    links.push(...file.cache.links);
  }
  if (file.cache?.embeds) {
    links.push(...file.cache.embeds);
  }
  const tagMeta = file.frontmatterTag
    ? getTagMeta(file.frontmatterTag)
    : undefined;

  const todos: TodoItem[] = [];
  for (let i = 0; i < fileLines.length; i++) {
    const line = fileLines[i];
    if (line.length === 0) continue;
    if (lineIsValidTodo(line)) {
      todos.push(formTodo(line, file, links, i, tagMeta));
    }
  }

  return todos;
};

const findAllTodosFromTagBlock = (file: FileInfo, tag: TagCache) => {
  const fileContents = file.content;
  const links = [];
  if (file.cache?.links) {
    links.push(...file.cache.links);
  }
  if (file.cache?.embeds) {
    links.push(...file.cache.embeds);
  }
  if (!fileContents) return [];
  const fileLines = getAllLinesFromFile(fileContents);
  const tagMeta = getTagMeta(tag.tag);
  const tagLine = fileLines[tag.position.start.line];
  if (lineIsValidTodo(tagLine)) {
    return [formTodo(tagLine, file, links, tag.position.start.line, tagMeta)];
  }

  const todos: TodoItem[] = [];
  for (let i = tag.position.start.line; i < fileLines.length; i++) {
    const line = fileLines[i];
    if (i === tag.position.start.line + 1 && line.length === 0) continue;
    if (line.length === 0) break;
    if (lineIsValidTodo(line)) {
      todos.push(formTodo(line, file, links, i, tagMeta));
    }
  }

  return todos;
};

const formTodo = (
  line: string,
  file: FileInfo,
  links: LinkCache[],
  lineNum: number,
  tagMeta?: TagMeta
): TodoItem => {
  const relevantLinks = links
    .filter((link) => link.position.start.line === lineNum)
    .map((link) => ({ filePath: link.link, linkName: link.displayText }));
  const linkMap = mapLinkMeta(relevantLinks);
  const rawText = extractTextFromTodoLine(line);
  const spacesIndented = getIndentationSpacesFromTodoLine(line);
  const tagStripped = removeTagFromText(rawText, tagMeta?.main);
  const md = new MD()
    .use(commentPlugin)
    .use(linkPlugin(linkMap))
    .use(tagPlugin)
    .use(highlightPlugin);
  return {
    mainTag: tagMeta?.main,
    subTag: tagMeta?.sub,
    checked: todoLineIsChecked(line),
    filePath: file.file.path,
    fileName: file.file.name,
    fileLabel: getFileLabelFromName(file.file.name),
    fileCreatedTs: file.file.stat.ctime,
    rawHTML: md.render(tagStripped),
    line: lineNum,
    spacesIndented,
    fileInfo: file,
    originalText: rawText,
  };
};

const setTodoStatusAtLineTo = (
  fileLines: string[],
  line: number,
  setTo: boolean
) => {
  fileLines[line] = setLineTo(fileLines[line], setTo);
  return combineFileLines(fileLines);
};
