import MD from 'markdown-it'
import picomatch from 'picomatch'

import {commentPlugin} from '../plugins/comment'
import {highlightPlugin} from '../plugins/highlight'
import {linkPlugin} from '../plugins/link'
import {tagPlugin} from '../plugins/tag'
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
  lineIsValidTodo,
  mapLinkMeta,
  removeTagFromText,
  setLineTo,
  todoLineIsChecked,
} from './helpers'

import type { App, LinkCache, MetadataCache, TagCache, TFile, Vault } from "obsidian"
import type { TodoItem, TagMeta, FileInfo } from "src/_types"

export const parseTodos = async (
  files: TFile[],
  todoTags: string[],
  cache: MetadataCache,
  vault: Vault,
  includeFiles: string,
  showChecked: boolean,
  lastRerender: number
): Promise<TodoItem[]> => {
  const includePattern = includeFiles.trim() ? includeFiles.trim().split("\n") : "**/*"
  const filesWithCache = await Promise.all(
    files
      .filter((file) => {
        if (file.stat.mtime < lastRerender) return false
        if (!picomatch.isMatch(file.path, includePattern)) return false
        if (todoTags.length === 1 && todoTags[0] === "*") return true
        const fileCache = cache.getFileCache(file)
        const allTags = getAllTagsFromMetadata(fileCache)
        const tagsOnPage = allTags.filter((tag) => todoTags.includes(getTagMeta(tag).main))
        return tagsOnPage.length > 0
      })
      .map<Promise<FileInfo>>(async (file) => {
        const fileCache = cache.getFileCache(file)
        const tagsOnPage = fileCache?.tags?.filter((e) => todoTags.includes(getTagMeta(e.tag).main)) ?? []
        const frontMatterTags = getFrontmatterTags(fileCache, todoTags)
        const hasFrontMatterTag = frontMatterTags.length > 0
        const parseEntireFile = todoTags[0] === "*" || hasFrontMatterTag
        const content = await vault.cachedRead(file)
        return {
          content,
          cache: fileCache,
          validTags: tagsOnPage.map((e) => ({ ...e, tag: e.tag.toLowerCase() })),
          file,
          parseEntireFile,
          frontmatterTag: todoTags.length ? frontMatterTags[0] : undefined,
        }
      })
  )
  let allTodos = filesWithCache.flatMap(findAllTodosInFile)

  if (!showChecked) allTodos = allTodos.filter((f) => !f.checked)

  console.log({ allTodos })

  return allTodos
}

export const toggleTodoItem = async (item: TodoItem, app: App) => {
  const file = getFileFromPath(app.vault, item.filePath)
  if (!file) return
  const currentFileContents = await app.vault.read(file)
  const currentFileLines = getAllLinesFromFile(currentFileContents)
  if (!currentFileLines[item.line].includes(item.originalText)) return
  const newData = setTodoStatusAtLineTo(currentFileLines, item.line, !item.checked)
  app.vault.modify(file, newData)
  item.checked = !item.checked
}

const findAllTodosInFile = (file: FileInfo): TodoItem[] => {
  if (!file.parseEntireFile) return file.validTags.flatMap((tag) => findAllTodosFromTagBlock(file, tag))

  if (!file.content) return []
  const fileLines = getAllLinesFromFile(file.content)
  const links = file.cache?.links ?? []
  const tagMeta = file.frontmatterTag ? getTagMeta(file.frontmatterTag) : undefined

  const todos: TodoItem[] = []
  for (let i = 0; i < fileLines.length; i++) {
    const line = fileLines[i]
    if (line.length === 0) continue
    if (lineIsValidTodo(line)) {
      todos.push(formTodo(line, file, links, i, tagMeta))
    }
  }

  return todos
}

const findAllTodosFromTagBlock = (file: FileInfo, tag: TagCache) => {
  const fileContents = file.content
  const links = file.cache.links ?? []
  if (!fileContents) return []
  const fileLines = getAllLinesFromFile(fileContents)
  const tagMeta = getTagMeta(tag.tag)
  const tagLine = fileLines[tag.position.start.line]
  if (lineIsValidTodo(tagLine)) {
    return [formTodo(tagLine, file, links, tag.position.start.line, tagMeta)]
  }

  const todos: TodoItem[] = []
  for (let i = tag.position.start.line; i < fileLines.length; i++) {
    const line = fileLines[i]
    if (i === tag.position.start.line + 1 && line.length === 0) continue
    if (line.length === 0) break
    if (lineIsValidTodo(line)) {
      todos.push(formTodo(line, file, links, i, tagMeta))
    }
  }

  return todos
}

const formTodo = (line: string, file: FileInfo, links: LinkCache[], lineNum: number, tagMeta?: TagMeta): TodoItem => {
  const relevantLinks = links
    .filter((link) => link.position.start.line === lineNum)
    .map((link) => ({ filePath: link.link, linkName: link.displayText }))
  const linkMap = mapLinkMeta(relevantLinks)
  const rawText = extractTextFromTodoLine(line)
  const spacesIndented = getIndentationSpacesFromTodoLine(line)
  const tagStripped = removeTagFromText(rawText, tagMeta?.main)
  const md = new MD().use(commentPlugin).use(linkPlugin(linkMap)).use(tagPlugin).use(highlightPlugin)
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
  }
}

const setTodoStatusAtLineTo = (fileLines: string[], line: number, setTo: boolean) => {
  fileLines[line] = setLineTo(fileLines[line], setTo)
  return combineFileLines(fileLines)
}
