import Plugin from 'markdown-it-regexp'

export const commentPlugin = Plugin(/\%\%([^\%]+)\%\%/, (match: string[], utils: any) => {
  return `<!--${utils.escape(match[1])}}-->`
})
