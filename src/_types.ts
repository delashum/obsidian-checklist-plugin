export type TodoItem = {
  checked: boolean
  filePath: string
  fileName: string
  fileLabel: string
  fileCreatedTs: number
  fileModifiedTs: number
  filterTags: string[]
  sourceLine: string
  parentLine?: number
  children: TodoItem[]
  mainTag?: string
  subTag?: string
  line: number
  spacesIndented: number
  originalText: string
  rawHTML: string
}

type BaseGroup = {
  path?: string
  label?: string
  type: GroupByType
  todos: TodoItem[]
  id: string
  sortName: string
  className: string
  oldestItem: number
  newestItem: number
  groups?: TodoGroup[]
}

export type PageGroup = BaseGroup & {
  type: 'page'
  pageName?: string
}
export type TagGroup = BaseGroup & {
  type: 'tag'
  mainTag?: string
  subTags?: string
}

export type FolderGroup = BaseGroup & {type: 'folder'}
export type TodoGroup = PageGroup | TagGroup | FolderGroup

export type TagMeta = {main: string; sub: string}
export type LinkMeta = {filePath: string; linkName: string}

export type GroupByType = 'page' | 'tag' | 'folder'
export type SortDirection =
  | 'new->old'
  | 'old->new'
  | 'a->z'
  | 'z->a'
  | 'source'
  | 'modified'
  | 'configured'
export type LookAndFeel = 'compact' | 'classic'

export type Icon = 'chevron' | 'settings'

export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never
}[keyof T]
