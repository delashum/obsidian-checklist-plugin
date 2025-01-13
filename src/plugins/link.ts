import {regexPlugin} from './plugin-helper'

import type {LinkMeta} from 'src/_types'
export const linkPlugin = (linkMap: Map<string, LinkMeta>) =>
  regexPlugin(/\[\[([^\]]+)\]\]/, (match: string[], utils: any) => {
    const content = match[1]
    const [link, label] = content.trim().split('|')
    const linkItem = linkMap.get(link.trim())
    let displayText = label ? label : linkItem ? linkItem.linkName : link
    if (label) {
      displayText = label
    } else if (linkItem) {
      displayText = linkItem.linkName
    } else {
      displayText = link
    }
    if (!linkItem) return `[[${content}]]`
    return `<a data-href="${link}" data-type="link" data-filepath="${
      linkItem.filePath
    }" class="internal-link">${utils.escape(displayText)}</a>`
  })
