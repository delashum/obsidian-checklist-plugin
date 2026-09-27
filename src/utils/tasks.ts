import MD from 'markdown-it'
import {Minimatch} from 'minimatch'
import {Notice} from 'obsidian'
import {commentPlugin} from '../plugins/comment'
import {highlightPlugin} from '../plugins/highlight'
import {linkPlugin} from '../plugins/link'
import {tagPlugin} from '../plugins/tag'
import {createDescendantLookup} from './hierarchy'
import {
  extractTextFromTodoLine,
  getAllLinesFromFile,
  getFileLabelFromName,
  getFrontmatterTags,
  getIndentationSpacesFromTodoLine,
  getTagMeta,
  matchesTodoTag,
  lineIsValidTodo,
  mapLinkMeta,
  removeTagFromText,
  setLineTo,
  todoLineIsChecked,
} from './helpers'
import type {App, MetadataCache, TFile, Vault} from 'obsidian'
import type {TodoItem, TagMeta} from 'src/_types'

/** Positive patterns are ORed; every negative pattern excludes from that set. */
export const createFileMatcher = (patterns: string) => {
  const rules = patterns
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
  const includes = rules
    .filter(s => !s.startsWith('!'))
    .map(p => new Minimatch(p, {dot: true}))
  const excludes = rules
    .filter(s => s.startsWith('!'))
    .map(s => new Minimatch(s.slice(1), {dot: true}))
  return (path: string) =>
    (!includes.length || includes.some(p => p.match(path))) &&
    !excludes.some(p => p.match(path))
}

export const matchesFilePatterns = (path: string, patterns: string) =>
  createFileMatcher(patterns)(path)

/** Bounded reads and per-file rendering keep large vaults from retaining all source text. */
export const parseTodos = async (
  files: TFile[],
  todoTags: string[],
  cache: MetadataCache,
  vault: Vault,
  includeFiles: string,
  showChecked: boolean,
  showAllTodos: boolean,
  lastRerender: number,
  excludedTags: string[] = [],
  onError: (file: TFile) => void = () => {},
  nestSubtasks = true,
): Promise<Map<TFile, TodoItem[]>> => {
  const results = new Map<TFile, TodoItem[]>()
  let matchesFile: ReturnType<typeof createFileMatcher>
  let next = 0
  async function worker() {
    while (next < files.length) {
      const file = files[next++]
      if (file.stat.mtime < lastRerender) continue
      try {
        matchesFile ??= createFileMatcher(includeFiles)
        if (!matchesFile(file.path)) {
          results.set(file, [])
          continue
        }
        const metadata = cache.getFileCache(file)
        const wildcard = todoTags.includes('*')
        const frontmatter = getFrontmatterTags(metadata)
        if (frontmatter.some(tag => matchesTodoTag(tag, excludedTags))) {
          results.set(file, [])
          continue
        }
        const matchedFrontmatter = frontmatter.filter(
          tag => wildcard || matchesTodoTag(tag, todoTags),
        )
        const tags = metadata?.tags ?? []
        const matchingTags = tags.filter(
          tag => wildcard || matchesTodoTag(tag.tag, todoTags),
        )
        if (!wildcard && !matchedFrontmatter.length && !matchingTags.length) {
          results.set(file, [])
          continue
        }
        const content = await vault.cachedRead(file)
        const lines = getAllLinesFromFile(content)
        const listItems = metadata?.listItems
        const relations = (listItems ?? []).map(item => ({
          line: item.position.start.line,
          parent: item.parent,
        }))
        const descendants = createDescendantLookup(relations)
        const relationMap = new Map(
          relations.map(item => [item.line, item.parent]),
        )
        const taskLines = new Set<number>()
        // Metadata excludes fenced examples and frontmatter. Fallback while the cache resolves.
        const blocked = new Set<number>()
        for (const section of metadata?.sections ?? []) {
          if (section.type === 'code' || section.type === 'yaml')
            for (
              let line = section.position.start.line;
              line <= section.position.end.line;
              line++
            )
              blocked.add(line)
        }
        let fence = ''
        let inFrontmatter = lines[0] === '---'
        for (let line = 0; line < lines.length; line++) {
          if (!listItems) {
            if (inFrontmatter) {
              if (line > 0 && /^(---|\.\.\.)\s*$/.test(lines[line]))
                inFrontmatter = false
              continue
            }
            const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(lines[line])?.[1]
            if (marker && !fence) {
              fence = marker
              continue
            }
            if (fence) {
              if (marker?.[0] === fence[0] && marker.length >= fence.length)
                fence = ''
              continue
            }
          }
          if (!blocked.has(line) && lineIsValidTodo(lines[line]))
            taskLines.add(line)
        }
        if (listItems) {
          const cachedTasks = new Set(
            listItems
              .filter(item => item.task != null)
              .map(item => item.position.start.line),
          )
          for (const line of taskLines)
            if (!cachedTasks.has(line)) taskLines.delete(line)
        }
        const selectBlock = (line: number) => {
          if (taskLines.has(line))
            return [...descendants(line)].filter(n => taskLines.has(n))
          const selected: number[] = []
          for (let n = line; n < lines.length; n++) {
            if (n === line + 1 && !lines[n].trim()) continue
            if (!lines[n].trim()) break
            if (taskLines.has(n)) selected.push(n)
          }
          return selected
        }
        const excluded = new Set<number>()
        for (const tag of tags.filter(tag =>
          matchesTodoTag(tag.tag, excludedTags),
        ))
          for (const line of selectBlock(tag.position.start.line))
            excluded.add(line)
        const selected = new Map<number, Map<string, TagMeta>>()
        const add = (line: number, tag?: string) => {
          if (excluded.has(line)) return
          const byTag = selected.get(line) ?? new Map<string, TagMeta>()
          byTag.set(
            tag?.toLowerCase() ?? '',
            tag ? getTagMeta(tag.toLowerCase()) : undefined,
          )
          selected.set(line, byTag)
        }
        for (const tag of matchingTags)
          for (const line of !nestSubtasks &&
          taskLines.has(tag.position.start.line)
            ? [tag.position.start.line]
            : selectBlock(tag.position.start.line))
            add(line, tag.tag)
        if (wildcard || matchedFrontmatter.length || showAllTodos) {
          for (const line of taskLines) {
            if (!selected.has(line)) {
              if (matchedFrontmatter.length)
                for (const tag of matchedFrontmatter) add(line, tag)
              else add(line)
            }
          }
        }
        const links = [...(metadata?.links ?? []), ...(metadata?.embeds ?? [])]
        const md = new MD()
          .use(commentPlugin)
          .use(
            linkPlugin(
              mapLinkMeta(
                links.map(link => ({
                  filePath: link.link,
                  linkName: link.displayText,
                })),
              ),
            ),
          )
          .use(tagPlugin)
          .use(highlightPlugin)
        const todos: TodoItem[] = []
        let rendered = 0
        for (const [line, tagMetas] of selected) {
          if (++rendered % 250 === 0)
            await new Promise(resolve => setTimeout(resolve, 0))
          const checked = todoLineIsChecked(lines[line])
          if (checked && !showChecked) continue
          let parentLine = relationMap.get(line)
          // A plain list item between two tasks should not sever the task hierarchy.
          const seen = new Set<number>()
          while (
            parentLine != null &&
            parentLine >= 0 &&
            !taskLines.has(parentLine) &&
            !seen.has(parentLine)
          ) {
            seen.add(parentLine)
            parentLine = relationMap.get(parentLine)
          }
          const originalText = extractTextFromTodoLine(lines[line])
          for (const tagMeta of tagMetas.values())
            todos.push({
              checked,
              filePath: file.path,
              fileName: file.name,
              fileLabel: getFileLabelFromName(file.name),
              fileCreatedTs: file.stat.ctime,
              fileModifiedTs: file.stat.mtime,
              mainTag: tagMeta?.main,
              subTag: tagMeta?.sub,
              line,
              parentLine:
                parentLine >= 0 && parentLine < line ? parentLine : undefined,
              children: [],
              spacesIndented: getIndentationSpacesFromTodoLine(lines[line]),
              originalText,
              sourceLine: lines[line],
              filterTags: tagMeta
                ? [[tagMeta.main, tagMeta.sub].filter(Boolean).join('/')]
                : [...matchedFrontmatter, ...matchingTags.map(tag => tag.tag)],
              rawHTML: md.render(
                removeTagFromText(originalText, tagMeta?.main),
              ),
            })
        }
        results.set(
          file,
          todos.sort((a, b) => a.line - b.line),
        )
      } catch (error) {
        // Leave failed files out so the view retries them on the next refresh.
        console.warn('Checklist: unable to read', file.path, error)
        onError(file)
      }
      // Give typing, navigation, and mobile rendering a chance between batches.
      if (next % 16 === 0) await new Promise(resolve => setTimeout(resolve, 0))
    }
  }
  await Promise.all(
    Array.from({length: Math.min(4, files.length)}, () => worker()),
  )
  // Disk completion order must not change source ordering.
  return new Map(
    files
      .filter(file => results.has(file))
      .map(file => [file, results.get(file)]),
  )
}

type TasksApi = {
  executeToggleTaskDoneCommand: (line: string, path: string) => string
}
/** Documented Tasks API; optional and resolved at click time to survive plugin reloads. */
export const getTasksApi = (app: App): TasksApi | undefined => {
  const api = (
    app as App & {plugins?: {plugins?: Record<string, {apiV1?: TasksApi}>}}
  ).plugins?.plugins?.['obsidian-tasks-plugin']?.apiV1
  return typeof api?.executeToggleTaskDoneCommand === 'function'
    ? api
    : undefined
}
export const toggleTodoItem = async (
  item: TodoItem,
  app: App,
  useTasksPlugin = false,
): Promise<boolean> => {
  const file = app.vault.getAbstractFileByPath(item.filePath) as TFile
  if (!file || file.extension !== 'md') {
    new Notice('This note is no longer available. Refresh Checklist.')
    return false
  }
  const tasksApi = useTasksPlugin ? getTasksApi(app) : undefined
  if (useTasksPlugin && !tasksApi) {
    new Notice(
      'Enable Tasks 7.2 or later, or turn off “Complete with Tasks” in Checklist settings.',
    )
    return false
  }
  let changed = false
  let replacement: string
  try {
    await app.vault.process(file, content => {
      const lines = getAllLinesFromFile(content)
      const current = lines[item.line]
      if (current !== item.sourceLine || !lineIsValidTodo(current))
        return content
      replacement = tasksApi
        ? tasksApi.executeToggleTaskDoneCommand(current, file.path)
        : setLineTo(current, !item.checked)
      if (typeof replacement !== 'string')
        throw new Error('Tasks returned an invalid task')
      changed = replacement !== current
      lines.splice(
        item.line,
        1,
        ...(replacement ? getAllLinesFromFile(replacement) : []),
      )
      return lines.join(content.includes('\r\n') ? '\r\n' : '\n')
    })
    if (changed && !tasksApi) {
      item.sourceLine = replacement
      item.checked = !item.checked
    } else if (!changed)
      new Notice(
        'This task changed in its note. Refresh Checklist and try again.',
      )
  } catch (error) {
    changed = false
    new Notice(
      'Could not save the task. Check that the note is available and try again.',
    )
    console.error('Checklist: task update failed', error)
  }
  return changed
}
