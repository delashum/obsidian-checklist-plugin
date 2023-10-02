import {App, MarkdownView, Keymap} from 'obsidian'

import {ensureMdExtension, getFileFromPath} from './helpers'

export const navToFile = async (
  app: App,
  path: string,
  ev: MouseEvent,
  line?: number,
) => {
  path = ensureMdExtension(path)
  const file = getFileFromPath(app.vault, path)
  if (!file) return
  const mod = Keymap.isModEvent(ev)
  const leaf = app.workspace.getLeaf(mod)
  await leaf.openFile(file)
  if (line) {
    app.workspace.getActiveViewOfType(MarkdownView).editor.setCursor(line)
  }
}

export const hoverFile = (event: MouseEvent, app: App, filePath: string) => {
  const targetElement = event.currentTarget
  const timeoutHandle = setTimeout(() => {
    app.workspace.trigger('link-hover', {}, targetElement, filePath, filePath)
  }, 800)
  targetElement.addEventListener('mouseleave', () => {
    clearTimeout(timeoutHandle)
  })
}
