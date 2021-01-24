import * as os from 'os'

import type { App, MetadataCache, TagCache, TFile } from "obsidian"
import type { TodoItem, TodoGroup, GroupByType, SortDirection, TagMeta } from "src/_types"

/** public */

export const parseTodos = (files: TFile[], pageLink: string, cache: MetadataCache, sort: SortDirection): TodoItem[] => {
  const allTodos = files
    .flatMap((file) => {
      const fileCache = cache.getFileCache(file)
      const tagsOnPage = fileCache?.tags?.filter((e) => getTagMeta(e.tag).main === pageLink) ?? []
      return tagsOnPage.flatMap((tag) => findAllTodosFromTagBlock(file, tag))
    })
    .filter((todo, i, a) => a.findIndex((_todo) => todo.line === _todo.line && todo.filePath === _todo.filePath) === i)

  allTodos.sort((a, b) => (sort === "new->old" ? b.fileCreatedTs - a.fileCreatedTs : a.fileCreatedTs - b.fileCreatedTs))
  return allTodos.filter((e) => e.text.length > 0 && /\S/.test(e.text))
}

export const groupTodos = (items: TodoItem[], groupBy: GroupByType): TodoGroup[] => {
  const groups: TodoGroup[] = []
  for (const item of items) {
    const itemKey =
      groupBy === "page" ? item.filePath : `#${[item.mainTag, item.subTag].filter((e) => e != null).join("/")}`
    let group = groups.find((g) => g.groupId === itemKey)
    if (!group) {
      group = {
        groupId: itemKey,
        groupName: groupBy === "page" ? item.fileLabel : item.subTag,
        type: groupBy,
        todos: [],
      }
      groups.push(group)
    }

    group.todos.push(item)
  }
  return groups.filter((g) => g.todos.length > 0)
}

export const toggleTodoItem = (item: TodoItem, app: App) => {
  const file = app.vault.getFiles().find((f) => f.path === item.filePath)
  const newData = setTodoStatusAtLineTo(file, item.line, !item.checked)
  app.vault.modify(file, newData)
}

export const navToFile = async (path: string, ev: MouseEvent) => {
  const app: App = (window as any).app
  const file = getFileFromPath(path, app)
  const leaf = isMetaPressed(ev) ? app.workspace.splitActiveLeaf() : app.workspace.getUnpinnedLeaf()
  await leaf.openFile(file)
}

/** private */

const getFileFromPath = (path: string, app: App) => app.vault.getFiles().find((f) => f.path === path)

const isMetaPressed = (e: MouseEvent): boolean => {
  return isMacOS() ? e.metaKey : e.ctrlKey
}

const findAllTodosFromTagBlock = (file: TFile, tag: TagCache) => {
  const fileContents = (file as any).cachedData
  if (!fileContents) return []
  const fileLines = getAllLinesFromFile(fileContents)
  const meta = getTagMeta(tag.tag)
  const tagLine = fileLines[tag.position.start.line]

  if (lineIsTodo(tagLine)) {
    return [formTodo(tagLine, file, meta, tag.position.start.line)]
  }

  const todos: TodoItem[] = []
  for (let i = tag.position.start.line; i < fileLines.length; i++) {
    const line = fileLines[i]
    if (line.length === 0) break
    if (lineIsTodo(line)) {
      todos.push(formTodo(line, file, meta, i))
    }
  }

  return todos.filter((e) => /\S/.test(e.text))
}

const formTodo = (line: string, file: TFile, tagMeta: TagMeta, lineNum: number): TodoItem => {
  return {
    mainTag: tagMeta.main,
    checked: todoLineIsChecked(line),
    text: removeTagFromText(extractTextFromTodoLine(line), tagMeta.main),
    filePath: file.path,
    fileName: file.name,
    fileLabel: getFileLabelFromName(file.name),
    fileCreatedTs: file.stat.ctime,
    line: lineNum,
    subTag: tagMeta?.sub,
  }
}

const setTodoStatusAtLineTo = (file: TFile, line: number, setTo: boolean) => {
  const fileContents = (file as any).cachedData
  if (!fileContents) return
  const fileLines = getAllLinesFromFile(fileContents)
  fileLines[line] = setLineTo(fileLines[line], setTo)
  return combineFileLines(fileLines)
}

const getTagMeta = (tag: string): TagMeta => {
  const [full, main, sub] = /^\#([^\/]+)\/?(.*)?$/.exec(tag)
  return { main, sub }
}

const setLineTo = (line: string, setTo: boolean) =>
  line.replace(/^(\s*\-\s\[)([^\]]+)(\].*$)/, `$1${setTo ? "x" : " "}$3`)

const getAllLinesFromFile = (cache: string) => cache.split(/\r?\n/)
const combineFileLines = (lines: string[]) => lines.join("\n")
const lineIsTodo = (line: string) => /^\s*\-\s\[(\s|x)\]/.test(line)
const extractTextFromTodoLine = (line: string) => /^\s*\-\s\[(\s|x)\]\s?(.*)$/.exec(line)?.[2]
const todoLineIsChecked = (line: string) => /^\s*\-\s\[x\]/.test(line)
const getFileLabelFromName = (filename: string) => /^(.+)\.md$/.exec(filename)?.[1]
const removeTagFromText = (text: string, tag: string) =>
  text.replace(new RegExp(`\\s?\\#${tag}[^\\s]*`, "g"), "").trim()

const isMacOS = () => {
  return os.platform() === "darwin"
}
