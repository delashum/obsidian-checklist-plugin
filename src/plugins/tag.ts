import Plugin from 'markdown-it-regexp'

import type { LinkMeta } from "src/_types"

export const tagPlugin = Plugin(/\#\S+/, (match: string[], utils: any) => {
  const content = match[0]
  return `<a href="${utils.escape(content)}" data-type="link" class="tag" target="_blank" rel="noopener">${utils.escape(
    content
  )}</a>`
})
