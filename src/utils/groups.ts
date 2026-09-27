import {classifyString} from './helpers'
import {buildTodoTree} from './hierarchy'
import type {TodoItem, TodoGroup, GroupByType, SortDirection} from 'src/_types'

const compareText = (a: string, b: string) =>
  a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'})
export const sortTodoTree = (
  items: TodoItem[],
  direction: SortDirection,
): TodoItem[] => {
  items.sort((a, b) => {
    if (direction === 'a->z') return compareText(a.originalText, b.originalText)
    if (direction === 'z->a') return compareText(b.originalText, a.originalText)
    const time =
      direction === 'modified'
        ? b.fileModifiedTs - a.fileModifiedTs
        : direction === 'new->old'
        ? b.fileCreatedTs - a.fileCreatedTs
        : direction === 'old->new'
        ? a.fileCreatedTs - b.fileCreatedTs
        : 0
    return time || compareText(a.filePath, b.filePath) || a.line - b.line
  })
  for (const item of items) sortTodoTree(item.children, direction)
  return items
}

export const groupTodos = (
  items: TodoItem[],
  groupBy: GroupByType,
  sortGroups: SortDirection,
  sortItems: SortDirection,
  subGroups: boolean,
  subGroupSort: SortDirection,
  configuredTags: string[] = [],
  parentId = '',
  nestSubtasks = true,
): TodoGroup[] => {
  const organize = (tasks: TodoItem[]) =>
    sortTodoTree(
      buildTodoTree(
        nestSubtasks
          ? tasks
          : tasks.map(task => ({...task, parentLine: undefined})),
      ),
      sortItems,
    )
  if (groupBy === 'none') {
    if (!items.length) return []
    return [
      {
        id: 'ungrouped',
        type: 'none',
        label: '',
        sortName: '',
        className: '',
        oldestItem: 0,
        newestItem: 0,
        todos: organize(items),
      },
    ]
  }
  const byKey = new Map<string, TodoGroup>()
  for (const item of items) {
    const folder = item.filePath.includes('/')
      ? item.filePath.slice(0, item.filePath.lastIndexOf('/'))
      : '/'
    const tag = item.mainTag
      ? '#' + [item.mainTag, item.subTag].filter(Boolean).join('/')
      : ''
    const key =
      groupBy === 'page' ? item.filePath : groupBy === 'folder' ? folder : tag
    let group = byKey.get(key)
    if (!group) {
      const label =
        groupBy === 'page'
          ? item.fileLabel
          : groupBy === 'folder'
          ? folder === '/'
            ? 'Vault root'
            : folder
          : tag || 'Untagged'
      group = {
        id: parentId ? JSON.stringify([parentId, groupBy, key]) : key,
        type: groupBy,
        path: groupBy === 'page' ? item.filePath : undefined,
        label,
        sortName: label,
        className: classifyString(label),
        todos: [],
        oldestItem: Infinity,
        newestItem: 0,
      }
      if (group.type === 'page') group.pageName = item.fileLabel
      if (group.type === 'tag') {
        group.mainTag = item.mainTag
        group.subTags = item.subTag
      }
      byKey.set(key, group)
    }
    group.newestItem = Math.max(group.newestItem, item.fileCreatedTs)
    group.oldestItem = Math.min(group.oldestItem, item.fileCreatedTs)
    group.todos.push(item)
  }
  const groups = [...byKey.values()]
  const configuredRank = (group: TodoGroup) => {
    const tag = group.label.replace(/^#/, '')
    const rank = configuredTags.findIndex(
      t => tag === t || tag.startsWith(t + '/'),
    )
    return rank < 0 ? configuredTags.length : rank
  }
  const modified = (group: TodoGroup) =>
    group.todos.reduce((n, t) => Math.max(n, t.fileModifiedTs), 0)
  groups.sort((a, b) => {
    if (sortGroups === 'new->old')
      return b.newestItem - a.newestItem || compareText(a.label, b.label)
    if (sortGroups === 'old->new')
      return a.oldestItem - b.oldestItem || compareText(a.label, b.label)
    if (sortGroups === 'modified')
      return modified(b) - modified(a) || compareText(a.label, b.label)
    if (sortGroups === 'z->a') return compareText(b.label, a.label)
    if (sortGroups === 'configured' && groupBy === 'tag')
      return (
        configuredRank(a) - configuredRank(b) || compareText(a.label, b.label)
      )
    return compareText(a.label, b.label)
  })
  for (const group of groups) {
    if (subGroups)
      group.groups = groupTodos(
        group.todos,
        groupBy === 'page' ? 'tag' : 'page',
        subGroupSort,
        sortItems,
        false,
        subGroupSort,
        configuredTags,
        group.id,
        nestSubtasks,
      )
    // One checkbox per source line in a page/folder; a task can still appear under distinct tags.
    group.todos = organize(group.todos)
  }
  return groups
}
