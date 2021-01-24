export type TextChunk = {
  type: "text"
  content: string
}
export type BoldChunk = {
  type: "bold"
  content: string
}
export type ItalicChunk = {
  type: "italic"
  content: string
}
export type LinkChunk = {
  type: "link"
  label: string
  filePath: string
}

export type TodoDisplayChunk = TextChunk | LinkChunk | BoldChunk | ItalicChunk

export type DisplayChunkType = TodoDisplayChunk["type"]
export type TokenChunk =
  | { content: string; type: "text" }
  | { content: TokenChunk[]; type: Exclude<DisplayChunkType, "text"> }

export type TodoItem = {
  checked: boolean
  display: TodoDisplayChunk[]
  filePath: string
  fileName: string
  fileLabel: string
  fileCreatedTs: number
  mainTag: string
  subTag?: string
  line: number
}

export type TodoGroup = {
  type: GroupByType
  todos: TodoItem[]
  groupName: string
  groupId: string
}

export type TagMeta = { main: string; sub: string }
export type LinkMeta = { filePath: string; linkName: string }

export type GroupByType = "page" | "tag"
export type SortDirection = "new->old" | "old->new"
