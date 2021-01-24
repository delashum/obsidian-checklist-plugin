export type TodoTextChunk = {
  type: "text"
  content: string
}
export type TodoLinkChunk = {
  type: "link"
  label: string
  filePath: string
}

export type TodoDisplayChunk = TodoTextChunk | TodoLinkChunk

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
