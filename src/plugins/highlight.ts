import {regexPlugin} from './plugin-helper'

export const highlightPlugin = regexPlugin(/\=\=([^\=]+)\=\=/, (match: string[], utils: any) => {
  return `<mark>${utils.escape(match[1])}</mark>`
})
