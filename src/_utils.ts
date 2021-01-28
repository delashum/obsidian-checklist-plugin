import * as os from 'os'

import type { App, LinkCache, MetadataCache, TagCache, TFile } from "obsidian"
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
} from "src/_types"
/** public */

export const parseTodos = (
  files: TFile[],
  pageLink: string,
  cache: MetadataCache,
  sort: SortDirection,
  ignoreFiles: string
): TodoItem[] => {
  const allTodos = files
    .flatMap((file) => {
      if (ignoreFiles && file.path.includes(ignoreFiles)) return []
      const fileCache = cache.getFileCache(file)
      const tagsOnPage = fileCache?.tags?.filter((e) => getTagMeta(e.tag).main === pageLink) ?? []
      return tagsOnPage.flatMap((tag) => findAllTodosFromTagBlock(file, tag, fileCache?.links ?? []))
    })
    .filter((todo, i, a) => a.findIndex((_todo) => todo.line === _todo.line && todo.filePath === _todo.filePath) === i)

  allTodos.sort((a, b) => (sort === "new->old" ? b.fileCreatedTs - a.fileCreatedTs : a.fileCreatedTs - b.fileCreatedTs))
  return allTodos
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
  path = ensureMdExtension(path)
  const app: App = (window as any).app
  const file = getFileFromPath(path, app)
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

const ensureMdExtension = (path: string) => {
  if (!/\.md$/.test(path)) return `${path}.md`
  return path
}

const getFileFromPath = (path: string, app: App) => app.vault.getFiles().find((f) => f.path.endsWith(path))

const isMetaPressed = (e: MouseEvent): boolean => {
  return isMacOS() ? e.metaKey : e.ctrlKey
}

const findAllTodosFromTagBlock = (file: TFile, tag: TagCache, links: LinkCache[]) => {
  const fileContents = (file as any).cachedData
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

const formTodo = (line: string, file: TFile, tagMeta: TagMeta, links: LinkCache[], lineNum: number): TodoItem => {
  const relevantLinks = links
    .filter((link) => link.position.start.line === lineNum)
    .map((link) => ({ filePath: link.link, linkName: link.displayText }))
  const linkMap = mapLinkMeta(relevantLinks)
  const rawText = extractTextFromTodoLine(line)
  const tagStripped = removeTagFromText(rawText, tagMeta.main)
  const rawChunks = parseTextContent(tagStripped)
  const displayChunks = decorateChunks(rawChunks, linkMap)
  return {
    mainTag: tagMeta.main,
    checked: todoLineIsChecked(line),
    display: displayChunks,
    filePath: file.path,
    fileName: file.name,
    fileLabel: getFileLabelFromName(file.name),
    fileCreatedTs: file.stat.ctime,
    line: lineNum,
    subTag: tagMeta?.sub,
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
        filePath: linkMap.get(chunk.rawText).filePath,
        label: linkMap.get(chunk.rawText).linkName,
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
const todoLineIsChecked = (line: string) => /^\s*\-\s\[x\]/.test(line)
const getFileLabelFromName = (filename: string) => /^(.+)\.md$/.exec(filename)?.[1]
const removeTagFromText = (text: string, tag: string) =>
  text.replace(new RegExp(`\\s?\\#${tag}[^\\s]*`, "g"), "").trim()

const isMacOS = () => {
  return os.platform() === "darwin"
}
