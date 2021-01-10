import * as os from 'os'

import type { App, MetadataCache, TagCache, TFile } from "obsidian"
import type { FileTodos, TodoItem } from "src/_types"
/** public */

export const parseTodosFromFiles = (files: TFile[], pageLink: string, cache: MetadataCache): FileTodos[] => {
  return files
    .map((file) => {
      const fileCache = cache.getFileCache(file)
      const tagsOnPage = fileCache?.tags?.filter((e) => getTagMeta(e.tag).main === pageLink) ?? []
      const allTodos = tagsOnPage.flatMap((tag) => findAllTodosFromLinkBlock(file, tag))
      return {
        name: file.name,
        path: file.path,
        todos: allTodos,
      }
    })
    .filter((e) => e.todos.length > 0)
}

export const toggleTodoItem = (item: TodoItem, app: App) => {
  const file = app.vault.getFiles().find((f) => f.path === item.file)
  const newData = setTodoStatusAtLineTo(file, item.line, !item.checked)
  app.vault.modify(file, newData)
}

export const isMetaPressed = (e: MouseEvent): boolean => {
  return isMacOS() ? e.metaKey : e.ctrlKey
}

export const getFileFromPath = (path: string, app: App) => app.vault.getFiles().find((f) => f.path === path)

/** private */

const findAllTodosFromLinkBlock = (file: TFile, tag: TagCache) => {
  const fileContents = (file as any).cachedData
  if (!fileContents) return []
  const fileLines = getAllLinesFromFile(fileContents)
  const todos: TodoItem[] = []
  for (let i = tag.position.start.line; i < fileLines.length; i++) {
    const line = fileLines[i]
    if (line.length === 0) break
    if (lineIsTodo(line)) {
      todos.push({
        checked: todoLineIsChecked(line),
        text: extractTextFromTodoLine(line),
        file: file.path,
        line: i,
        subTag: getTagMeta(tag.tag)?.sub,
      })
    }
  }

  return todos
}

const setTodoStatusAtLineTo = (file: TFile, line: number, setTo: boolean) => {
  const fileContents = (file as any).cachedData
  if (!fileContents) return
  const fileLines = getAllLinesFromFile(fileContents)
  fileLines[line] = setLineTo(fileLines[line], setTo)
  return combineFileLines(fileLines)
}

const getTagMeta = (tag: string): { main: string; sub: string } => {
  const [full, main, sub] = /^\#([^\/]+)\/?(.*)?$/.exec(tag)
  return { main, sub }
}

const setLineTo = (line: string, setTo: boolean) =>
  line.replace(/^(\s*\-\s\[)([^\]]+)(\].*$)/, `$1${setTo ? "x" : " "}$3`)

const getAllLinesFromFile = (cache: string) => cache.split(/\r?\n/)
const combineFileLines = (lines: string[]) => lines.join("\n")
const lineIsTodo = (line: string) => /^\s*\-\s\[(\s|x)\]/.test(line)
const extractTextFromTodoLine = (line: string) => /^\s*\-\s\[(\s|x)\]\s?(.*)$/.exec(line)?.[2]
const todoLineIsChecked = (line: string) => /^\s*\-\s\[(\s|x)\]/.exec(line)?.[1] === "x"

const isMacOS = () => {
  return os.platform() === "darwin"
}
