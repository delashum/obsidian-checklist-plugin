import {App, LinkCache, MetadataCache, TagCache, TFile, Vault} from 'obsidian'

import {LOCAL_SORT_OPT} from './constants'

import type {
  TodoItem,
  TodoGroup,
  GroupByType,
  SortDirection,
  TagMeta,
  TodoDisplayChunk,
  LinkMeta,
  DisplayChunkType,
  TokenChunk,
  FileInfo,
} from "src/_types"
/** public */

export const parseTodos = async (
  files: TFile[],
  pageLink: string,
  cache: MetadataCache,
  vault: Vault,
  ignoreFiles: string,
  sort: SortDirection
): Promise<TodoItem[]> => {
  const filesWithCache = await Promise.all(
    files
      .filter((file) => {
        if (ignoreFiles && file.path.includes(ignoreFiles)) return false
        const fileCache = cache.getFileCache(file)
        const tagsOnPage = fileCache?.tags?.filter((e) => getTagMeta(e.tag).main === pageLink) ?? []
        return !!tagsOnPage?.length
      })
      .map<Promise<FileInfo>>(async (file) => {
        const fileCache = cache.getFileCache(file)
        const tagsOnPage = fileCache?.tags?.filter((e) => getTagMeta(e.tag).main === pageLink) ?? []
        const content = await vault.cachedRead(file)
        return { content, cache: fileCache, validTags: tagsOnPage, file }
      })
  )
  const allTodos = filesWithCache
    .flatMap((file) => {
      return file.validTags.flatMap((tag) => findAllTodosFromTagBlock(file, tag))
    })
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

export const navToFile = async (app: App, path: string, ev: MouseEvent) => {
  path = ensureMdExtension(path)
  const file = getFileFromPath(app.vault, path)
  if (!file) return
  const leaf = isMetaPressed(ev) ? app.workspace.splitActiveLeaf() : app.workspace.getUnpinnedLeaf()
  await leaf.openFile(file)
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
  const file = vault.getAbstractFileByPath(path)
  if (file instanceof TFile) return file
}

const ensureMdExtension = (path: string) => {
  if (!/\.md$/.test(path)) return `${path}.md`
  return path
}

const isMetaPressed = (e: MouseEvent): boolean => {
  return isMacOS() ? e.metaKey : e.ctrlKey
}

const findAllTodosFromTagBlock = (file: FileInfo, tag: TagCache) => {
  const fileContents = file.content
  const links = file.cache.links ?? []
  if (!fileContents) return []
  const fileLines = getAllLinesFromFile(fileContents)
  const tagMeta = getTagMeta(tag.tag)
  const tagLine = fileLines[tag.position.start.line]
  if (lineIsValidTodo(tagLine, tagMeta.main)) {
    return [formTodo(tagLine, file, tagMeta, links, tag.position.start.line)]
  }

  const todos: TodoItem[] = []
  for (let i = tag.position.start.line; i < fileLines.length; i++) {
    const line = fileLines[i]
    if (line.length === 0) break
    if (lineIsValidTodo(line, tagMeta.main)) {
      todos.push(formTodo(line, file, tagMeta, links, i))
    }
  }

  return todos
}

const formTodo = (line: string, file: FileInfo, tagMeta: TagMeta, links: LinkCache[], lineNum: number): TodoItem => {
  const relevantLinks = links
    .filter((link) => link.position.start.line === lineNum)
    .map((link) => ({ filePath: link.link, linkName: link.displayText }))
  const linkMap = mapLinkMeta(relevantLinks)
  const rawText = extractTextFromTodoLine(line)
  const spacesIndented = getIndentationSpacesFromTodoLine(line)
  const tagStripped = removeTagFromText(rawText, tagMeta.main)
  const rawChunks = parseTextContent(tagStripped)
  const displayChunks = decorateChunks(rawChunks, linkMap)
  return {
    mainTag: tagMeta.main,
    checked: todoLineIsChecked(line),
    display: displayChunks,
    filePath: file.file.path,
    fileName: file.file.name,
    fileLabel: getFileLabelFromName(file.file.name),
    fileCreatedTs: file.file.stat.ctime,
    line: lineNum,
    subTag: tagMeta?.sub,
    spacesIndented,
    fileInfo: file,
    originalText: rawText,
  }
}

const decorateChunks = (chunks: TokenChunk[], linkMap: Map<string, LinkMeta>): TodoDisplayChunk[] => {
  return chunks.map((chunk) => {
    if (chunk.type === "text")
      return {
        value: chunk.rawText,
        type: "text",
      }

    const children = decorateChunks(chunk.children, linkMap)

    if (chunk.type === "link")
      return {
        type: "link",
        children,
        filePath: linkMap.get(chunk.rawText)?.filePath,
        label: linkMap.get(chunk.rawText)?.linkName,
      }

    return { type: chunk.type, children }
  })
}

const parseTextContent = (formula: string): TokenChunk[] => {
  let tokens: TokenChunk[] = parseTokensFromText(
    [{ rawText: formula, type: "text" }],
    "bold",
    /\*\*[^\*]+\*\*/,
    /\*\*([^\*]+)\*\*/g
  )
  tokens = parseTokensFromText(tokens, "italic", /\*[^\*]+\*/, /\*([^\*]+)\*/g)
  tokens = parseTokensFromText(tokens, "link", /\[\[[^\]]+\]\]/, /\[\[([^\]]+)\]\]/g)

  return tokens
}

const parseTokensFromText = <T extends DisplayChunkType>(
  chunks: TokenChunk[],
  type: T,
  splitRegex: RegExp,
  tokenRegex: RegExp
): TokenChunk[] => {
  return chunks.flatMap((chunk) => {
    if (chunk.type === "text") {
      const pieces = chunk.rawText.split(splitRegex)
      const tokens = getAllMatches(tokenRegex, chunk.rawText, 1)
      return pieces.flatMap((piece, i) => {
        const token = tokens[i]
        const finalPieces = []
        if (piece) finalPieces.push({ type: "text", rawText: piece })
        if (token)
          finalPieces.push({
            type,
            rawText: token,
            children: [{ type: "text", rawText: token }],
          })
        return finalPieces
      })
    } else {
      return [
        {
          type: chunk.type,
          rawText: chunk.rawText,
          children: parseTokensFromText(chunk.children, type, splitRegex, tokenRegex),
        },
      ]
    }
  })
}

const getAllMatches = (r: RegExp, string: string, captureIndex = 0) => {
  if (!r.global) throw new Error("getAllMatches(): cannot get matches for non-global regex.")
  const matches: string[] = []
  r.lastIndex = 0 // reset regexp to first match
  let match: RegExpExecArray
  while ((match = r.exec(string))) matches.push(match[captureIndex])
  return matches
}

const setTodoStatusAtLineTo = (fileLines: string[], line: number, setTo: boolean) => {
  fileLines[line] = setLineTo(fileLines[line], setTo)
  return combineFileLines(fileLines)
}

const getTagMeta = (tag: string): TagMeta => {
  const [full, main, sub] = /^\#([^\/]+)\/?(.*)?$/.exec(tag)
  return { main, sub }
}

const mapLinkMeta = (linkMeta: LinkMeta[]) => {
  const map = new Map<string, LinkMeta>()
  for (const link of linkMeta) map.set(link.filePath, link)
  return map
}

const setLineTo = (line: string, setTo: boolean) =>
  line.replace(/^(\s*\-\s\[)([^\]]+)(\].*$)/, `$1${setTo ? "x" : " "}$3`)

const getAllLinesFromFile = (cache: string) => cache.split(/\r?\n/)
const combineFileLines = (lines: string[]) => lines.join("\n")
const lineIsValidTodo = (line: string, tag: string) => {
  const tagRemoved = removeTagFromText(line, tag)
  return /^\s*\-\s\[(\s|x)\]\s*\S/.test(tagRemoved)
}
const extractTextFromTodoLine = (line: string) => /^\s*\-\s\[(\s|x)\]\s?(.*)$/.exec(line)?.[2]
const getIndentationSpacesFromTodoLine = (line: string) => /^(\s*)\-\s\[(\s|x)\]\s?.*$/.exec(line)?.[1]?.length ?? 0
const todoLineIsChecked = (line: string) => /^\s*\-\s\[x\]/.test(line)
const getFileLabelFromName = (filename: string) => /^(.+)\.md$/.exec(filename)?.[1]
const removeTagFromText = (text: string, tag: string) =>
  text.replace(new RegExp(`\\s?\\#${tag}[^\\s]*`, "g"), "").trim()

const isMacOS = () => window.navigator.userAgent.includes("Macintosh")
