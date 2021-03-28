import type { CachedMetadata, LinkCache, TagCache, TFile } from "obsidian"

export type TextChunk = {
  type: "text"
  value: string
}
export type BoldChunk = {
  type: "bold"
  children: TodoDisplayChunk[]
}
export type ItalicChunk = {
  type: "italic"
  children: TodoDisplayChunk[]
}
export type LinkChunk = {
  type: "link"
  children: TodoDisplayChunk[]
  label: string
  filePath: string
}

export type TodoDisplayChunk = TextChunk | LinkChunk | BoldChunk | ItalicChunk

export type DisplayChunkType = TodoDisplayChunk["type"]
export type TokenChunk =
  | { rawText: string; type: "text" }
  | { children: TokenChunk[]; rawText: string; type: Exclude<DisplayChunkType, "text"> }

export type TodoItem = {
  checked: boolean
  display: TodoDisplayChunk[]
  filePath: string
  fileName: string
  fileLabel: string
  fileCreatedTs: number
  mainTag?: string
  subTag?: string
  line: number
  spacesIndented: number
  fileInfo: FileInfo
  originalText: string
}

export type TodoGroup = {
  type: GroupByType
  todos: TodoItem[]
  groupName: string
  groupId: string
}

export type FileInfo = {
  content: string
  cache: CachedMetadata
  parseEntireFile: boolean
  frontmatterTag: string
  file: TFile
  validTags: TagCache[]
}

export type TagMeta = { main: string; sub: string }
export type LinkMeta = { filePath: string; linkName: string }

export type GroupByType = "page" | "tag"
export type SortDirection = "new->old" | "old->new" | "a->z" | "z->a"
export type LookAndFeel = "compact" | "classic"

export type Icon = "chevron"
