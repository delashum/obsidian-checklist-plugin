export type HierarchyItem = {
  filePath: string
  line: number
  parentLine?: number
  children: HierarchyItem[]
}

export type ListItemRelation = {
  line: number
  parent: number
}

/**
 * Reconstructs task trees from Obsidian's list-item parent line metadata.
 * A task whose parent is not in the supplied collection is promoted to a root.
 */
export const buildTodoTree = <T extends HierarchyItem>(items: T[]): T[] => {
  const itemsByLocation = new Map<string, T>()
  const roots: T[] = []

  for (const item of items) {
    itemsByLocation.set(locationKey(item.filePath, item.line), {
      ...item,
      children: [],
    })
  }

  for (const item of itemsByLocation.values()) {
    const parent =
      item.parentLine == null
        ? undefined
        : itemsByLocation.get(locationKey(item.filePath, item.parentLine))

    if (parent && parent.line < item.line) parent.children.push(item)
    else roots.push(item)
  }

  return roots
}

/** Returns the root list item and every nested descendant list item. */
export const createDescendantLookup = (items: readonly ListItemRelation[]) => {
  const childrenByParent = new Map<number, number[]>()
  for (const item of items) {
    const children = childrenByParent.get(item.parent) ?? []
    children.push(item.line)
    childrenByParent.set(item.parent, children)
  }
  return (rootLine: number): Set<number> => {
    const descendants = new Set<number>([rootLine])
    const pending = [rootLine]
    while (pending.length > 0) {
      const parent = pending.pop()
      for (const child of childrenByParent.get(parent) ?? []) {
        if (descendants.has(child)) continue
        descendants.add(child)
        pending.push(child)
      }
    }

    return descendants
  }
}

export const collectDescendantLineNumbers = (
  items: readonly ListItemRelation[],
  rootLine: number,
) => createDescendantLookup(items)(rootLine)

export const countTodoTree = (items: readonly HierarchyItem[]): number =>
  items.reduce((count, item) => count + 1 + countTodoTree(item.children), 0)

const locationKey = (filePath: string, line: number) => `${filePath}:${line}`
