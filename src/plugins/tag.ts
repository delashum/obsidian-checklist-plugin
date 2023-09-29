import {regexPlugin} from './plugin-helper'

export const tagPlugin = regexPlugin(/\#\S+/, (match, utils) => {
  const content = match[0]
  return `<a href="${utils.escape(
    content,
  )}" data-type="link" class="tag" target="_blank" rel="noopener">${utils.escape(
    content,
  )}</a>`
})
