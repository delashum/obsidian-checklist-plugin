import MD from 'markdown-it'
import picomatch from 'picomatch'
import {App, CachedMetadata, LinkCache, MarkdownView, MetadataCache, parseFrontMatterTags, TagCache, TFile, Vault} from 'obsidian'

import {LOCAL_SORT_OPT} from './constants'
import {commentPlugin} from './plugins/comment'
import {highlightPlugin} from './plugins/highlight'
import {linkPlugin} from './plugins/link'
import {tagPlugin} from './plugins/tag'

import type { TodoItem, TodoGroup, GroupByType, SortDirection, TagMeta, LinkMeta, FileInfo } from "src/_types"
/** public */

export const parseTodos = async (
  files: TFile[],
  todoTag: string,
  cache: MetadataCache,
  vault: Vault,
  ignoreFiles: string,
  includeFiles: string,
  sort: SortDirection
): Promise<TodoItem[]> => {
  const filesWithCache = await Promise.all(
    files
      .filter((file) => {
        if (ignoreFiles && picomatch.isMatch(file.path, ignoreFiles)) return false
        if (includeFiles && !file.path.startsWith(includeFiles)) return false
        if (!todoTag) return true
        const fileCache = cache.getFileCache(file)
        const allTags = getAllTagsFromMetadata(fileCache)
        const tagsOnPage = allTags.filter((tag) => getTagMeta(tag).main === todoTag)
        return tagsOnPage.length > 0
      })
      .map<Promise<FileInfo>>(async (file) => {
        const fileCache = cache.getFileCache(file)
        const tagsOnPage = fileCache?.tags?.filter((e) => getTagMeta(e.tag).main === todoTag) ?? []
        const frontMatterTags = getFrontmatterTags(fileCache, todoTag)
        const hasFrontMatterTag = frontMatterTags.length > 0
        const parseEntireFile = !todoTag || hasFrontMatterTag
        const content = await vault.cachedRead(file)
        return {
          content,
          cache: fileCache,
          validTags: tagsOnPage,
          file,
          parseEntireFile,
          frontmatterTag: todoTag ? frontMatterTags[0] : undefined,
        }
      })
  )
  const allTodos = filesWithCache
    .flatMap(findAllTodosInFile)
    .filter((todo, i, a) => a.findIndex((_todo) => todo.line === _todo.line && todo.filePath === _todo.filePath) === i)

  if (sort === "new->old") allTodos.sort((a, b) => b.fileCreatedTs - a.fileCreatedTs)
  if (sort === "old->new") allTodos.sort((a, b) => a.fileCreatedTs - b.fileCreatedTs)

  return allTodos
}

export const groupTodos = (items: TodoItem[], groupBy: GroupByType, sort: SortDirection): TodoGroup[] => {
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

  const nonEmptyGroups = groups.filter((g) => g.todos.length > 0)

  if (sort === "a->z")
    nonEmptyGroups.sort((a, b) => a.groupName.localeCompare(b.groupName, navigator.language, LOCAL_SORT_OPT))
  if (sort === "z->a")
    nonEmptyGroups.sort((a, b) => b.groupName.localeCompare(a.groupName, navigator.language, LOCAL_SORT_OPT))

  return nonEmptyGroups
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

export const navToFile = async (app: App, path: string, ev: MouseEvent, line?: number) => {
  path = ensureMdExtension(path)
  const file = getFileFromPath(app.vault, path)
  if (!file) return
  const leaf = isMetaPressed(ev) ? app.workspace.splitActiveLeaf() : app.workspace.getUnpinnedLeaf()
  await leaf.openFile(file)
  if (line) {
    app.workspace.getActiveViewOfType(MarkdownView)?.currentMode?.applyScroll(line);
  }
}

export const hoverFile = (event: MouseEvent, app: App, filePath: string) => {
  const targetElement = event.currentTarget
  const timeoutHandle = setTimeout(() => {
    app.workspace.trigger("link-hover", {}, targetElement, filePath, filePath)
  }, 800)
  targetElement.addEventListener("mouseleave", () => {
    clearTimeout(timeoutHandle)
  })
}

/** private */

const getFileFromPath = (vault: Vault, path: string) => {
  let file = vault.getAbstractFileByPath(path)
  if (file instanceof TFile) return file
  const files = vault.getFiles()
  file = files.find((e) => e.name === path)
  if (file instanceof TFile) return file
}

const ensureMdExtension = (path: string) => {
  if (!/\.md$/.test(path)) return `${path}.md`
  return path
}

const isMetaPressed = (e: MouseEvent): boolean => {
  return isMacOS() ? e.metaKey : e.ctrlKey
}

const getFrontmatterTags = (cache: CachedMetadata, todoTag?: string) => {
  const frontMatterTags: string[] = parseFrontMatterTags(cache?.frontmatter) ?? []
  if (todoTag) return frontMatterTags.filter((tag: string) => getTagMeta(tag).main === todoTag)
  return frontMatterTags
}

const getAllTagsFromMetadata = (cache: CachedMetadata): string[] => {
  if (!cache) return []
  const frontmatterTags = getFrontmatterTags(cache)
  const blockTags = (cache.tags ?? []).map((e) => e.tag)
  return [...frontmatterTags, ...blockTags]
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
    if (lineIsValidTodo(line, "")) {
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
  if (lineIsValidTodo(tagLine, tagMeta.main)) {
    return [formTodo(tagLine, file, links, tag.position.start.line, tagMeta)]
  }

  const todos: TodoItem[] = []
  for (let i = tag.position.start.line; i < fileLines.length; i++) {
    const line = fileLines[i]
    if (i === tag.position.start.line + 1 && line.length === 0) continue
    if (line.length === 0) break
    if (lineIsValidTodo(line, tagMeta.main)) {
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
    checked: todoLineIsChecked(line),
    filePath: file.file.path,
    fileName: file.file.name,
    fileLabel: getFileLabelFromName(file.file.name),
    fileCreatedTs: file.file.stat.ctime,
    rawHTML: md.render(tagStripped),
    line: lineNum,
    subTag: tagMeta?.sub,
    spacesIndented,
    fileInfo: file,
    originalText: rawText,
  }
}

const setTodoStatusAtLineTo = (fileLines: string[], line: number, setTo: boolean) => {
  fileLines[line] = setLineTo(fileLines[line], setTo)
  return combineFileLines(fileLines)
}

const getTagMeta = (tag: string): TagMeta => {
  const tagMatch = /^\#([^\/]+)\/?(.*)?$/.exec(tag)
  if (!tagMatch) return { main: null, sub: null }
  const [full, main, sub] = tagMatch
  return { main, sub }
}

const mapLinkMeta = (linkMeta: LinkMeta[]) => {
  const map = new Map<string, LinkMeta>()
  for (const link of linkMeta) map.set(link.filePath, link)
  return map
}

const setLineTo = (line: string, setTo: boolean) =>
  line.replace(/^(\s*([\-\*]|[0-9]+\.)\s\[)([^\]]+)(\].*$)/, `$1${setTo ? "x" : " "}$4`)

const getAllLinesFromFile = (cache: string) => cache.split(/\r?\n/)
const combineFileLines = (lines: string[]) => lines.join("\n")
const lineIsValidTodo = (line: string, tag: string) => {
  const tagRemoved = removeTagFromText(line, tag)
  return /^\s*([\-\*]|[0-9]+\.)\s\[(\s|x)\]\s*\S/.test(line)
}
const extractTextFromTodoLine = (line: string) => /^\s*([\-\*]|[0-9]+\.)\s\[(\s|x)\]\s?(.*)$/.exec(line)?.[3]
const getIndentationSpacesFromTodoLine = (line: string) => /^(\s*)([\-\*]|[0-9]+\.)\s\[(\s|x)\]\s?.*$/.exec(line)?.[1]?.length ?? 0
const todoLineIsChecked = (line: string) => /^\s*([\-\*]|[0-9]+\.)\s\[x\]/.test(line)
const getFileLabelFromName = (filename: string) => /^(.+)\.md$/.exec(filename)?.[1]
const removeTagFromText = (text: string, tag: string) => {
  if (!text) return ""
  if (!tag) return text.trim()
  return text.replace(new RegExp(`\\s?\\#${tag}[^\\s]*`, "g"), "").trim()
}

const isMacOS = () => window.navigator.userAgent.includes("Macintosh")
