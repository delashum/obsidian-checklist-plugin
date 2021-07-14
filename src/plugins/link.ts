import {regexPlugin} from './plugin-helper'

import type { LinkMeta } from "src/_types"
export const linkPlugin = (linkMap: Map<string, LinkMeta>) =>
  regexPlugin(/\[\[([^\]]+)\]\]/, (match: string[], utils: any) => {
    const content = match[1]
    const [link, label] = content.split("|")
    return `<a data-href="${link}" data-type="link" data-filepath="${
      linkMap.get(link)?.filePath
    }" class="internal-link">${utils.escape(label || link)}</a>`
  })
