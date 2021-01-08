import type { LinkCache, MetadataCache, TFile } from "obsidian";
import type { TodoItem } from "src/_types";

export const parseTodosFromFiles = (files: TFile[], pageLink: string, cache: MetadataCache) => {
  return files.flatMap((file) => {
    const fileCache = cache.getFileCache(file);
    const linksOnPage = fileCache?.links?.filter((e) => e.link === pageLink) ?? [];
    return linksOnPage.flatMap((link) => findAllTodosFromLinkBlock(file, link));
  });
};

const findAllTodosFromLinkBlock = (file: TFile, link: LinkCache) => {
  const fileContents = (file as any).cachedData;
  if (!fileContents) return [];
  const fileLines = getAllLinesFromFile(fileContents);
  const todos: TodoItem[] = [];
  for (let i = link.position.start.line; i < fileLines.length; i++) {
    const line = fileLines[i];
    if (line.length === 0) break;
    if (lineIsTodo(line)) {
      todos.push({
        checked: todoLineIsChecked(line),
        text: extractTextFromTodoLine(line),
        file: file.path,
        line: i,
      });
    }
  }

  return todos;
};

const getAllLinesFromFile = (cache: string) => cache.split(/\r?\n/);
const lineIsTodo = (line: string) => /^\s*\-\s\[(\s|x)\]/.test(line);
const extractTextFromTodoLine = (line: string) => /^\s*\-\s\[(\s|x)\]\s?(.*)$/.exec(line)?.[2];
const todoLineIsChecked = (line: string) => /^\s*\-\s\[(\s|x)\]/.exec(line)?.[1] === "x";
