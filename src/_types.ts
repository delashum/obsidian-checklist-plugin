export type TodoItem = {
  checked: boolean
  text: string
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

export type GroupByType = "page" | "tag"
export type SortDirection = "new->old" | "old->new"
