import {regexPlugin} from './plugin-helper'

export const commentPlugin = regexPlugin(/\%\%([^\%]+)\%\%/, (match: string[], utils: any) => {
  return `<!--${utils.escape(match[1])}}-->`
})
